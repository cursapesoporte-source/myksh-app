"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmImport } from "@/app/actions/imports/confirm-import";
import { cancelImport } from "@/app/actions/imports/cancel-import";

type ReviewAction = "pending" | "import" | "skip_duplicate" | "skip_manual";

export type ImportCandidateRow = {
  id: string;
  occurred_at: string;
  amount: number;
  type: "ingreso" | "gasto";
  description: string;
  counterparty: string | null;
  duplicate_transaction_id: string | null;
  duplicate_confidence: number | null;
  review_action: ReviewAction;
  review_note: string | null;
};

type Props = {
  batchId: string;
  initialCandidates: ImportCandidateRow[];
};

const LONG_PRESS_MS = 500;

export function ImportReviewScreen({ batchId, initialCandidates }: Props) {
  const router = useRouter();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [isPending, startTransition] = useTransition();
  const [isCancelling, startCancelTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  // --- Selección múltiple estilo shift-click ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [rangeHint, setRangeHint] = useState<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartIndex = useRef<number | null>(null);

  const orderedIds = useMemo(() => candidates.map((c) => c.id), [candidates]);

  function clearPressTimer() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function handleCheckboxPointerDown(index: number) {
    pressStartIndex.current = index;
    pressTimer.current = setTimeout(() => {
      setRangeHint("Ahora toca la otra casilla para seleccionar todo el rango entre ambas.");
    }, LONG_PRESS_MS);
  }

  function handleCheckboxPointerUp(index: number) {
    const wasLongPress = pressTimer.current === null && rangeHint !== null;
    clearPressTimer();

    setCandidates((prev) => prev); // no-op, mantiene referencia estable

    setSelectedIds((prev) => {
      const next = new Set(prev);
      const id = orderedIds[index];

      if (wasLongPress || rangeHint) {
        // Modo rango: si ya hay un "ancla" previa, selecciona todo el
        // tramo entre la ancla y este índice (como shift-click).
        if (lastClickedIndex !== null) {
          const [start, end] = [lastClickedIndex, index].sort((a, b) => a - b);
          for (let i = start; i <= end; i++) next.add(orderedIds[i]);
        } else {
          next.add(id);
        }
        setRangeHint(null);
      } else {
        // Toque simple: alterna solo esa casilla.
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }

      return next;
    });

    setLastClickedIndex(index);
  }

  useEffect(() => {
    return () => clearPressTimer();
  }, []);

  function selectAllPending() {
    setSelectedIds(new Set(candidates.filter((c) => c.review_action === "pending").map((c) => c.id)));
    setLastClickedIndex(null);
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
    setRangeHint(null);
  }

  function applyBulkAction(action: Exclude<ReviewAction, "pending">) {
    setCandidates((prev) =>
      prev.map((c) => (selectedIds.has(c.id) ? { ...c, review_action: action } : c))
    );
    clearSelection();
  }

  const summary = useMemo(() => {
    const toImport = candidates.filter((c) => c.review_action === "import").length;
    const duplicates = candidates.filter((c) => c.review_action === "skip_duplicate").length;
    const manualSkips = candidates.filter((c) => c.review_action === "skip_manual").length;
    const pending = candidates.filter((c) => c.review_action === "pending").length;

    const totalGasto = candidates
      .filter((c) => c.review_action === "import" && c.type === "gasto")
      .reduce((sum, c) => sum + c.amount, 0);
    const totalIngreso = candidates
      .filter((c) => c.review_action === "import" && c.type === "ingreso")
      .reduce((sum, c) => sum + c.amount, 0);

    return { toImport, duplicates, manualSkips, pending, totalGasto, totalIngreso };
  }, [candidates]);

  function updateAction(id: string, action: ReviewAction) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, review_action: action } : c)));
  }

  function handleConfirm() {
    setFeedback(null);
    startTransition(async () => {
      const decisions = candidates
        .filter((c) => c.review_action !== "pending")
        .map((c) => ({ candidateId: c.id, action: c.review_action as Exclude<ReviewAction, "pending"> }));

      const result = await confirmImport(batchId, decisions);
      if (!result.ok) {
        setFeedback(`Error: ${result.error}`);
        return;
      }

      setFeedback(
        `Listo. Se crearon ${result.insertedCount} transacciones nuevas. ${result.skippedCount} movimientos fueron descartados. Redirigiendo al dashboard...`
      );
      setRedirecting(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    });
  }

  function handleCancel() {
    setFeedback(null);
    startCancelTransition(async () => {
      const result = await cancelImport(batchId);
      if (!result.ok) {
        setFeedback(`Error al cancelar: ${result.error}`);
        return;
      }
      router.push("/importar");
      router.refresh();
    });
  }

  const hasPending = summary.pending > 0;
  const isBusy = isPending || isCancelling || redirecting;
  const hasSelection = selectedIds.size > 0;

  return (
    <div className="space-y-4 pb-24">
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-800 p-4 sm:grid-cols-4">
        <SummaryItem label="Para importar" value={summary.toImport} />
        <SummaryItem label="Duplicados" value={summary.duplicates} />
        <SummaryItem label="Omitidos manual" value={summary.manualSkips} />
        <SummaryItem label="Pendientes" value={summary.pending} warn={hasPending} />
      </div>

      <div className="rounded-lg border border-neutral-800 p-4 text-sm">
        <p>Total a importar como gasto: <strong>S/ {summary.totalGasto.toFixed(2)}</strong></p>
        <p>Total a importar como ingreso: <strong>S/ {summary.totalIngreso.toFixed(2)}</strong></p>
      </div>

      {hasPending && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm">
          <button
            type="button"
            onClick={selectAllPending}
            className="rounded border border-neutral-700 px-3 py-1.5 hover:bg-neutral-800"
          >
            Seleccionar todos los pendientes ({summary.pending})
          </button>
          <span className="text-neutral-500">
            O toca una casilla y mantenla presionada ~0.5s para activar selección por rango, luego toca otra casilla.
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left">
            <tr>
              <th className="p-2 w-8"></th>
              <th className="p-2">Fecha</th>
              <th className="p-2">Descripción</th>
              <th className="p-2">Monto</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, index) => (
              <tr
                key={c.id}
                className={`border-t border-neutral-800 ${selectedIds.has(c.id) ? "bg-blue-950/40" : ""}`}
              >
                <td className="p-2">
                  {c.review_action === "pending" && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => {}}
                      onPointerDown={() => handleCheckboxPointerDown(index)}
                      onPointerUp={() => handleCheckboxPointerUp(index)}
                      onPointerLeave={clearPressTimer}
                      className="h-4 w-4"
                    />
                  )}
                </td>
                <td className="p-2">{new Date(c.occurred_at).toLocaleDateString("es-PE")}</td>
                <td className="p-2">
                  {c.description}
                  {c.counterparty && <span className="block text-xs text-neutral-500">{c.counterparty}</span>}
                </td>
                <td className={`p-2 ${c.type === "gasto" ? "text-red-400" : "text-green-400"}`}>
                  S/ {c.amount.toFixed(2)}
                </td>
                <td className="p-2">{c.type}</td>
                <td className="p-2">
                  {c.duplicate_transaction_id ? (
                    <span className="rounded bg-amber-900/40 px-2 py-1 text-xs text-amber-300">
                      Posible duplicado ({c.duplicate_confidence ?? "?"}%)
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-900/40 px-2 py-1 text-xs text-emerald-300">Nuevo</span>
                  )}
                </td>
                <td className="p-2">
                  <select
                    className="rounded border border-neutral-700 bg-neutral-950 p-1"
                    value={c.review_action}
                    disabled={isBusy}
                    onChange={(e) => updateAction(c.id, e.target.value as ReviewAction)}
                  >
                    <option value="pending">Sin decidir</option>
                    <option value="import">Importar</option>
                    <option value="skip_duplicate">Omitir (duplicado)</option>
                    <option value="skip_manual">Omitir (manual)</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {feedback && <p className="text-sm">{feedback}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          disabled={hasPending || isBusy || candidates.length === 0}
          onClick={handleConfirm}
          className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-neutral-950 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : redirecting ? "Redirigiendo..." : "Confirmar importación"}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={handleCancel}
          className="rounded-lg border border-red-800 px-4 py-2 font-semibold text-red-300 hover:bg-red-950 disabled:opacity-50"
        >
          {isCancelling ? "Cancelando..." : "Cancelar importación"}
        </button>
      </div>

      {hasPending && (
        <p className="text-xs text-amber-400">
          Aún hay {summary.pending} movimientos sin decidir. Debes marcar todos antes de confirmar.
        </p>
      )}

      {/* Barra flotante: aparece solo si hay elementos seleccionados */}
      {hasSelection && (
        <div className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-3 rounded-full border border-neutral-700 bg-neutral-900 px-5 py-3 shadow-xl">
          <span className="text-sm font-semibold">{selectedIds.size} seleccionados</span>

          <select
            className="rounded border border-neutral-700 bg-neutral-950 p-1.5 text-sm"
            defaultValue=""
            onChange={(e) => {
              const value = e.target.value as Exclude<ReviewAction, "pending"> | "";
              if (value) applyBulkAction(value);
            }}
          >
            <option value="" disabled>Cambiar a...</option>
            <option value="import">Importar</option>
            <option value="skip_duplicate">Omitir (duplicado)</option>
            <option value="skip_manual">Omitir (manual)</option>
          </select>

          <button
            type="button"
            onClick={clearSelection}
            className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
          >
            Cancelar selección
          </button>

          {rangeHint && (
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-amber-900 px-3 py-1 text-xs text-amber-200">
              {rangeHint}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`text-lg font-bold ${warn ? "text-amber-400" : ""}`}>{value}</p>
    </div>
  );
}
