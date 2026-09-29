"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uploadStatement } from "@/app/actions/imports/upload-statement";
import { unlockBcpPdf } from "@/app/actions/imports/unlock-bcp-pdf";

type Props = {
  initialBatchId?: string;
  initialStatus?: string;
};

export function ImportUploadPanel({ initialBatchId, initialStatus }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batchId, setBatchId] = useState(initialBatchId ?? "");
  const [status, setStatus] = useState(initialStatus ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitFile() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setMessage("Selecciona un archivo primero.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setMessage(null);

    startTransition(async () => {
      const result = await uploadStatement(formData);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      setBatchId(result.batchId);
      setStatus(result.status);
      setMessage(result.message);

      if (result.status === "reviewing") {
        router.push(`/importar/${result.batchId}`);
        router.refresh();
      }
    });
  }

  function submitPassword() {
    if (!batchId) {
      setMessage("No se encontró el lote del PDF.");
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await unlockBcpPdf(batchId, password);
      setPassword("");

      if (!result.ok) {
        setMessage(
          result.attemptsLeft === undefined
            ? result.error
            : `${result.error} Intentos restantes: ${result.attemptsLeft}.`
        );
        return;
      }

      setMessage(result.message);
      router.push(`/importar/${result.batchId}`);
      router.refresh();
    });
  }

  const needsPassword = status === "password_required" && Boolean(batchId);

  return (
    <section className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-950 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Importar movimientos</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Sube un reporte XLSX de Yape o un estado de cuenta PDF. Ningún movimiento se guarda hasta que lo confirmes.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="shrink-0 rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
        >
          ← Volver al dashboard
        </Link>
      </div>

      {!needsPassword && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="block w-full rounded-lg border border-neutral-700 bg-neutral-900 p-2 text-sm"
          />
          <button
            type="button"
            onClick={submitFile}
            disabled={isPending}
            className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "Procesando..." : "Subir archivo"}
          </button>
        </div>
      )}

      {needsPassword && (
        <div className="space-y-3 rounded-lg border border-amber-900/50 bg-amber-950/20 p-4">
          <p className="text-sm text-amber-200">
            Si el PDF está protegido, ingresa su contraseña. Si no tiene contraseña, deja este campo vacío.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña del PDF (opcional si no tiene)"
            autoComplete="off"
            className="block w-full rounded-lg border border-neutral-700 bg-neutral-900 p-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitPassword}
              disabled={isPending}
              className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-neutral-950 disabled:opacity-50"
            >
              {isPending ? "Analizando..." : "Desbloquear y analizar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus("");
                setBatchId("");
                setMessage(null);
              }}
              disabled={isPending}
              className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
            >
              Subir otro archivo
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-sm text-neutral-300">{message}</p>}
    </section>
  );
}
