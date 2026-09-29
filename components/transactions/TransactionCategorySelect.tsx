"use client";

import { useState, useTransition } from "react";
import { updateTransactionCategory } from "@/app/actions/transactions";

type CategoryOption = { id: string; name: string };

type Props = {
  transactionId: string;
  currentCategoryId: string | null;
  categories: CategoryOption[];
};

/**
 * Selector inline para asignar/cambiar la categoría de una transacción
 * YA EXISTENTE (importada o manual). Guarda automáticamente al cambiar,
 * sin necesidad de un botón "Guardar" aparte. Colócalo dentro de cada
 * fila de tu lista de transacciones, junto al monto o la fecha.
 *
 * Ejemplo de uso dentro de tu TransactionRow existente:
 *
 * <TransactionCategorySelect
 *   transactionId={tx.id}
 *   currentCategoryId={tx.category_id}
 *   categories={categories}
 * />
 */
export default function TransactionCategorySelect({
  transactionId,
  currentCategoryId,
  categories,
}: Props) {
  const [value, setValue] = useState(currentCategoryId ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleChange(newValue: string) {
    setValue(newValue);
    setError("");
    startTransition(async () => {
      try {
        await updateTransactionCategory(transactionId, newValue || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar.");
        setValue(currentCategoryId ?? "");
      }
    });
  }

  return (
    <div className="inline-flex flex-col">
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className={`min-h-9 rounded-lg border px-2 py-1 text-xs outline-none focus:border-[#4ADE80] ${
          value
            ? "border-white/10 bg-black/20 text-[#E5E7EB]"
            : "border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FBBF24]"
        } ${isPending ? "opacity-50" : ""}`}
      >
        <option value="" className="bg-[#0B0F14] text-[#FBBF24]">
          Sin categoría
        </option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id} className="bg-[#0B0F14] text-[#E5E7EB]">
            {cat.name}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 text-[10px] text-[#F87171]">{error}</span>}
    </div>
  );
}
