"use client";

import { useRef, useState } from "react";
import { createTransaction } from "@/app/actions/transactions";

type Account = { id: string; name: string; currency: string };
type Category = { id: string; name: string; type: string };

type NewTransactionFormProps = {
  accounts: Account[];
  categories: Category[];
};

// Función auxiliar para obtener el formato YYYY-MM-THH:mm ajustado a la zona horaria local
function getLocalDateTimeValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16);
}

export default function NewTransactionForm({
  accounts,
  categories,
}: NewTransactionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<"ingreso" | "gasto">("gasto");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === type);

  async function handleAction(formData: FormData) {
    setError("");
    setLoading(true);

    try {
      await createTransaction(formData);
      formRef.current?.reset();
      setType("gasto");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo registrar."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!accounts.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        Primero crea una cuenta para poder registrar transacciones.
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleAction}
      className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2 flex gap-2">
        <button
          type="button"
          onClick={() => setType("gasto")}
          className={`min-h-11 flex-1 rounded-xl border px-4 text-sm font-semibold transition ${
            type === "gasto"
              ? "border-[#F87171] bg-[#F87171]/15 text-[#F87171]"
              : "border-white/10 text-white/60"
          }`}
        >
          Gasto
        </button>
        <button
          type="button"
          onClick={() => setType("ingreso")}
          className={`min-h-11 flex-1 rounded-xl border px-4 text-sm font-semibold transition ${
            type === "ingreso"
              ? "border-[#4ADE80] bg-[#4ADE80]/15 text-[#4ADE80]"
              : "border-white/10 text-white/60"
          }`}
        >
          Ingreso
        </button>
        <input type="hidden" name="type" value={type} />
      </div>

      <div>
        <label htmlFor="account_id" className="mb-2 block text-sm">
          Cuenta
        </label>
        <select
          id="account_id"
          name="account_id"
          required
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
        >
          {accounts.map((account) => (
            <option
              key={account.id}
              value={account.id}
              className="bg-[#0B0F14] text-[#E5E7EB]"
            >
              {account.name} ({account.currency})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="category_id" className="mb-2 block text-sm">
          Categoría
        </label>
        <select
          id="category_id"
          name="category_id"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
        >
          <option value="" className="bg-[#0B0F14] text-[#E5E7EB]">
            Sin categoría
          </option>
          {filteredCategories.map((category) => (
            <option
              key={category.id}
              value={category.id}
              className="bg-[#0B0F14] text-[#E5E7EB]"
            >
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="amount" className="mb-2 block text-sm">
          Monto
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]"
        />
      </div>

      <div>
        <label htmlFor="occurred_at" className="mb-2 block text-sm">
          Fecha y hora
        </label>
        <input
          id="occurred_at"
          name="occurred_at"
          type="datetime-local"
          defaultValue={getLocalDateTimeValue(new Date())}
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="description" className="mb-2 block text-sm">
          Nota (opcional)
        </label>
        <input
          id="description"
          name="description"
          placeholder="Ej. Almuerzo, sueldo de septiembre..."
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
        {loading ? "Guardando..." : "Registrar"}
      </button>
    </form>
  );
}