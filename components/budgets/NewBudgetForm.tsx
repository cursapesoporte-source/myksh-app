"use client";

import { useRef, useState } from "react";
import { createBudget } from "@/app/actions/budgets";

type CategoryOption = { id: string; name: string; icon: string };

export default function NewBudgetForm({ categories }: { categories: CategoryOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAction(formData: FormData) {
    setError("");
    setLoading(true);
    try {
      await createBudget(formData);
      formRef.current?.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el presupuesto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={handleAction}
      className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-3"
    >
      <div>
        <label htmlFor="category_id" className="mb-2 block text-sm">
          Categoría
        </label>
        <select
          id="category_id"
          name="category_id"
          required
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
        >
          <option value="" className="bg-[#0B0F14]">Selecciona...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id} className="bg-[#0B0F14] text-[#E5E7EB]">
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="monthly_limit" className="mb-2 block text-sm">
          Límite mensual
        </label>
        <input
          id="monthly_limit"
          name="monthly_limit"
          type="number"
          step="0.01"
          required
          placeholder="500.00"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]"
        />
      </div>

      <div>
        <label htmlFor="currency" className="mb-2 block text-sm">
          Moneda
        </label>
        <select
          id="currency"
          name="currency"
          defaultValue="PEN"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
        >
          <option value="PEN" className="bg-[#0B0F14] text-[#E5E7EB]">Soles (PEN)</option>
          <option value="USD" className="bg-[#0B0F14] text-[#E5E7EB]">Dólares (USD)</option>
          <option value="USDT" className="bg-[#0B0F14] text-[#E5E7EB]">USDT</option>
        </select>
      </div>

      {error && (
        <p className="sm:col-span-3 rounded-xl border border-[#F87171]/30 bg-[#F87171]/10 px-4 py-3 text-sm text-[#F87171]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="sm:col-span-3 min-h-11 rounded-xl bg-[#4ADE80] px-4 py-3 font-semibold text-[#0B0F14] disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Crear o actualizar presupuesto"}
      </button>
    </form>
  );
}
