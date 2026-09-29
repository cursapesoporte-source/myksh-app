"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  bulkDeleteTransactions,
  bulkUpdateTransactionCategory,
  deleteTransaction,
  updateTransactionCategory,
} from "@/app/actions/transactions";

type EnrichedTransaction = {
  id: string;
  amount: number;
  type: "ingreso" | "gasto";
  description: string | null;
  occurred_at: string;
  currency: string;
  account_id: string;
  category_id: string | null;
  account_name: string;
  category_name: string | null;
};

type CategoryOption = { id: string; name: string; type: string };

const CURRENCY_SYMBOL: Record<string, string> = { PEN: "S/", USD: "$", USDT: "₮" };
const LONG_PRESS_MS = 500;

export default function TransactionsList({
  transactions,
  categories,
}: {
  transactions: EnrichedTransaction[];
  categories: CategoryOption[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [isPending, startTransition] = useTransition();
  const [rangeAnchor, setRangeAnchor] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const sortedIds = useMemo(() => transactions.map((t) => t.id), [transactions]);
  const uncategorizedCount = transactions.filter((t) => !t.category_id).length;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectRangeTo(index: number) {
    if (rangeAnchor === null) return;
    const [start, end] = rangeAnchor < index ? [rangeAnchor, index] : [index, rangeAnchor];
    setSelected((prev) => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) next.add(sortedIds[i]);
      return next;
    });
  }

  function handlePressStart(index: number) {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setRangeAnchor(index);
    }, LONG_PRESS_MS);
  }

  function handlePressEnd(index: number, id: string) {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (longPressFired.current) {
      // El long-press ya activó el ancla en handlePressStart; este segundo
      // toque cierra el rango.
      selectRangeTo(index);
      setRangeAnchor(null);
      longPressFired.current = false;
    } else if (rangeAnchor !== null) {
      // Ya había un ancla activa de una pulsación larga anterior.
      selectRangeTo(index);
      setRangeAnchor(null);
    } else {
      toggleOne(id);
    }
  }

  function selectAllUncategorized() {
    setSelected(new Set(transactions.filter((t) => !t.category_id).map((t) => t.id)));
  }

  function clearSelection() {
    setSelected(new Set());
    setBulkCategory("");
  }

  function applyBulkCategory() {
    const categoryId = bulkCategory || null;
    const ids = Array.from(selected);
    startTransition(async () => {
      await bulkUpdateTransactionCategory(ids, categoryId);
      clearSelection();
    });
  }

  function applyBulkDelete() {
    if (!confirm(`¿Eliminar ${selected.size} transacciones seleccionadas? Esta acción no se puede deshacer.`)) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      await bulkDeleteTransactions(ids);
      clearSelection();
    });
  }

  function handleSingleDelete(id: string) {
    if (!confirm("¿Eliminar esta transacción?")) return;
    startTransition(async () => {
      await deleteTransaction(id);
    });
  }

  function handleSingleCategoryChange(id: string, categoryId: string) {
    startTransition(async () => {
      await updateTransactionCategory(id, categoryId || null);
    });
  }

  return (
    <div className="relative">
      {uncategorizedCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#FBBF24]/30 bg-[#FBBF24]/10 p-4 text-sm text-[#FBBF24]">
          <span>{uncategorizedCount} transacciones sin categoría (probablemente importadas).</span>
          <button
            onClick={selectAllUncategorized}
            className="rounded-lg border border-[#FBBF24]/40 px-3 py-1 font-semibold hover:bg-[#FBBF24]/20"
          >
            Seleccionar todas las sin categoría
          </button>
        </div>
      )}

      <p className="mb-3 text-xs text-white/40">
        Toca una casilla y mantenla presionada ~0.5s para activar selección por rango, luego toca otra casilla.
      </p>

      <div className="grid gap-3">
        {transactions.map((tx, index) => {
          const symbol = CURRENCY_SYMBOL[tx.currency] ?? tx.currency;
          const isIncome = tx.type === "ingreso";
          const isSelected = selected.has(tx.id);
          const date = new Date(tx.occurred_at).toLocaleString("es-PE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });

          return (
            <div
              key={tx.id}
              className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                isSelected ? "border-[#4ADE80]/40 bg-[#4ADE80]/5" : "border-white/10 bg-white/5"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                readOnly
                onMouseDown={() => handlePressStart(index)}
                onMouseUp={() => handlePressEnd(index, tx.id)}
                onTouchStart={() => handlePressStart(index)}
                onTouchEnd={() => handlePressEnd(index, tx.id)}
                className="h-4 w-4 shrink-0 accent-[#4ADE80]"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[#E5E7EB]">
                  {tx.description || (isIncome ? "Ingreso" : "Gasto")}
                </p>
                <p className="truncate text-xs text-white/50">
                  {tx.account_name} · {tx.category_name ?? "Sin categoría"} · {date}
                </p>
              </div>

              <select
                value={tx.category_id ?? ""}
                onChange={(e) => handleSingleCategoryChange(tx.id, e.target.value)}
                disabled={isPending}
                className={`hidden min-h-9 shrink-0 rounded-lg border px-2 py-1 text-xs outline-none focus:border-[#4ADE80] sm:block ${
                  tx.category_id
                    ? "border-white/10 bg-black/20 text-[#E5E7EB]"
                    : "border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FBBF24]"
                }`}
              >
                <option value="" className="bg-[#0B0F14] text-[#FBBF24]">Sin categoría</option>
                {categories
                  .filter((c) => c.type === tx.type)
                  .map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-[#0B0F14] text-[#E5E7EB]">
                      {cat.name}
                    </option>
                  ))}
              </select>

              <span className={`shrink-0 font-mono font-semibold ${isIncome ? "text-[#4ADE80]" : "text-[#F87171]"}`}>
                {isIncome ? "+" : "-"}{symbol} {tx.amount.toFixed(2)}
              </span>

              <button
                onClick={() => handleSingleDelete(tx.id)}
                className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs hover:border-[#F87171] hover:text-[#F87171]"
              >
                Eliminar
              </button>
            </div>
          );
        })}

        {transactions.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
            Todavía no registras transacciones.
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-fit max-w-[95vw] flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#0B0F14] px-4 py-3 shadow-lg">
          <span className="text-sm font-medium text-[#E5E7EB]">{selected.size} seleccionados</span>

          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="min-h-9 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
          >
            <option value="" className="bg-[#0B0F14]">Cambiar a...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} className="bg-[#0B0F14] text-[#E5E7EB]">
                {cat.name}
              </option>
            ))}
          </select>

          <button
            onClick={applyBulkCategory}
            disabled={isPending || !bulkCategory}
            className="min-h-9 rounded-lg bg-[#4ADE80] px-3 py-1 text-sm font-semibold text-[#0B0F14] disabled:opacity-50"
          >
            Aplicar
          </button>

          <button
            onClick={applyBulkDelete}
            disabled={isPending}
            className="min-h-9 rounded-lg border border-[#F87171]/40 px-3 py-1 text-sm text-[#F87171] disabled:opacity-50"
          >
            Eliminar seleccionados
          </button>

          <button onClick={clearSelection} className="min-h-9 rounded-lg border border-white/10 px-3 py-1 text-sm text-white/60">
            Cancelar selección
          </button>
        </div>
      )}
    </div>
  );
}
