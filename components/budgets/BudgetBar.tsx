"use client";

import { useState, useTransition } from "react";
import { deleteBudget, updateBudgetLimit, type BudgetProgress } from "@/app/actions/budgets";

const CURRENCY_SYMBOL: Record<string, string> = { PEN: "S/", USD: "$", USDT: "₮" };

export default function BudgetBar({ budget }: { budget: BudgetProgress }) {
  const [editing, setEditing] = useState(false);
  const [limitInput, setLimitInput] = useState(String(budget.monthlyLimit));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const symbol = CURRENCY_SYMBOL[budget.currency] ?? budget.currency;
  const overBudget = budget.percentage > 100;
  const barColor = overBudget ? "bg-[#F87171]" : budget.percentage >= 80 ? "bg-[#FBBF24]" : "bg-[#4ADE80]";
  const barWidth = Math.min(budget.percentage, 100);

  function handleSaveLimit() {
    const parsed = Number(limitInput.replace(",", "."));
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError("Ingresa un número mayor a cero.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await updateBudgetLimit(budget.id, parsed);
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar.");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar el presupuesto de "${budget.categoryName}"?`)) return;
    startTransition(async () => {
      await deleteBudget(budget.id);
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-[#E5E7EB]">{budget.categoryName}</p>
          <p className="text-xs text-white/50">
            {symbol}{budget.spent.toFixed(2)} de {symbol}{budget.monthlyLimit.toFixed(2)}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {editing ? (
            <>
              <input
                type="number"
                step="0.01"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                className="w-24 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-right outline-none focus:border-[#4ADE80]"
              />
              <button
                onClick={handleSaveLimit}
                disabled={isPending}
                className="rounded-lg bg-[#4ADE80] px-2 py-1 font-semibold text-[#0B0F14] disabled:opacity-50"
              >
                Guardar
              </button>
              <button onClick={() => setEditing(false)} className="text-white/50 hover:text-white">
                Cancelar
              </button>
            </>
          ) : (
            <>
              <span className={overBudget ? "font-semibold text-[#F87171]" : "text-white/60"}>
                {budget.percentage}%
              </span>
              <button onClick={() => setEditing(true)} className="text-white/50 hover:text-[#4ADE80]">
                Editar
              </button>
              <button onClick={handleDelete} className="text-white/50 hover:text-[#F87171]">
                Eliminar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/30">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barWidth}%` }} />
      </div>

      {overBudget && (
        <p className="mt-2 text-xs text-[#F87171]">
          Excediste el límite por {symbol}{Math.abs(budget.remaining).toFixed(2)}.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-[#F87171]">{error}</p>}
    </div>
  );
}
