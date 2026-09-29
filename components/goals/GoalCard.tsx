"use client";

import { useState, useTransition } from "react";
import { addGoalContribution, deleteGoal, type GoalWithProjection } from "@/app/actions/goals";

const CURRENCY_SYMBOL: Record<string, string> = { PEN: "S/", USD: "$", USDT: "₮" };

export default function GoalCard({ goal }: { goal: GoalWithProjection }) {
  const [contribution, setContribution] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const symbol = CURRENCY_SYMBOL[goal.currency] ?? goal.currency;
  const isComplete = goal.percentage >= 100;

  function handleAddContribution(sign: 1 | -1) {
    const parsed = Number(contribution.replace(",", "."));
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError("Ingresa un monto mayor a cero.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await addGoalContribution(goal.id, parsed * sign);
        setContribution("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar.");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar la meta "${goal.name}"?`)) return;
    startTransition(async () => {
      await deleteGoal(goal.id);
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#E5E7EB]">{goal.name}</p>
          <p className="mt-1 text-sm text-white/50">
            {symbol}{goal.currentAmount.toFixed(2)} de {symbol}{goal.targetAmount.toFixed(2)}
          </p>
        </div>
        <button onClick={handleDelete} className="shrink-0 text-xs text-white/40 hover:text-[#F87171]">
          Eliminar
        </button>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/30">
        <div
          className={`h-full rounded-full ${isComplete ? "bg-[#4ADE80]" : "bg-[#60A5FA]"}`}
          style={{ width: `${goal.percentage}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-white/50">{goal.percentage}% completado</p>

      {isComplete ? (
        <p className="mt-3 text-sm font-medium text-[#4ADE80]">¡Meta alcanzada! 🎉</p>
      ) : (
        <div className="mt-3 space-y-1 text-xs text-white/50">
          {goal.targetDate && (
            <p>Fecha límite: {new Date(goal.targetDate).toLocaleDateString("es-PE")}</p>
          )}
          {goal.projectedCompletionDate ? (
            <p className={goal.onTrack === false ? "text-[#F87171]" : "text-white/50"}>
              Al ritmo de ahorro actual, la alcanzarías el{" "}
              {new Date(goal.projectedCompletionDate).toLocaleDateString("es-PE", {
                month: "long",
                year: "numeric",
              })}
              {goal.onTrack === false && " (después de tu fecha límite)"}
              {goal.onTrack === true && goal.targetDate && " (a tiempo)"}
            </p>
          ) : (
            <p>Sin ahorro neto positivo en los últimos 3 meses; no se puede proyectar fecha.</p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="number"
          step="0.01"
          value={contribution}
          onChange={(e) => setContribution(e.target.value)}
          placeholder="Monto"
          className="w-28 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#4ADE80]"
        />
        <button
          onClick={() => handleAddContribution(1)}
          disabled={isPending}
          className="rounded-lg bg-[#4ADE80] px-3 py-2 text-sm font-semibold text-[#0B0F14] disabled:opacity-50"
        >
          + Aportar
        </button>
        <button
          onClick={() => handleAddContribution(-1)}
          disabled={isPending}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 hover:border-[#F87171] hover:text-[#F87171] disabled:opacity-50"
        >
          - Retirar
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[#F87171]">{error}</p>}
    </div>
  );
}
