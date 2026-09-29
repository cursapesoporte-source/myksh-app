"use client";

import { useRef, useState } from "react";
import { createGoal } from "@/app/actions/goals";

export default function NewGoalForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAction(formData: FormData) {
    setError("");
    setLoading(true);
    try {
      await createGoal(formData);
      formRef.current?.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la meta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={handleAction}
      className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label htmlFor="name" className="mb-2 block text-sm">Nombre de la meta</label>
        <input
          id="name"
          name="name"
          required
          placeholder="Ej. Fondo de emergencia"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]"
        />
      </div>

      <div>
        <label htmlFor="target_amount" className="mb-2 block text-sm">Monto objetivo</label>
        <input
          id="target_amount"
          name="target_amount"
          type="number"
          step="0.01"
          required
          placeholder="5000.00"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]"
        />
      </div>

      <div>
        <label htmlFor="current_amount" className="mb-2 block text-sm">Monto actual (opcional)</label>
        <input
          id="current_amount"
          name="current_amount"
          type="number"
          step="0.01"
          defaultValue="0"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]"
        />
      </div>

      <div>
        <label htmlFor="currency" className="mb-2 block text-sm">Moneda</label>
        <select
          id="currency"
          name="currency"
          defaultValue="PEN"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
        >
          <option value="PEN" className="bg-[#0B0F14]">Soles (PEN)</option>
          <option value="USD" className="bg-[#0B0F14]">Dólares (USD)</option>
          <option value="USDT" className="bg-[#0B0F14]">USDT</option>
        </select>
      </div>

      <div>
        <label htmlFor="target_date" className="mb-2 block text-sm">Fecha límite (opcional)</label>
        <input
          id="target_date"
          name="target_date"
          type="date"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]"
        />
      </div>

      {error && (
        <p className="sm:col-span-2 rounded-xl border border-[#F87171]/30 bg-[#F87171]/10 px-4 py-3 text-sm text-[#F87171]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="sm:col-span-2 min-h-11 rounded-xl bg-[#4ADE80] px-4 py-3 font-semibold text-[#0B0F14] disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear meta"}
      </button>
    </form>
  );
}
