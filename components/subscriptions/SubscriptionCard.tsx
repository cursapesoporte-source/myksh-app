"use client";

import { useRef, useState, useTransition } from "react";
import {
  deleteTrackedSubscription,
  markSubscriptionPaid,
  toggleSubscriptionActive,
  updateTrackedSubscription,
  type TrackedSubscriptionRow,
} from "@/app/actions/subscriptions";

const CURRENCY_SYMBOL: Record<string, string> = { PEN: "S/", USD: "$", USDT: "₮" };
const CYCLE_LABEL: Record<string, string> = { mensual: "/mes", anual: "/año", semanal: "/semana" };

export default function SubscriptionCard({ sub }: { sub: TrackedSubscriptionRow }) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [cycle, setCycle] = useState(sub.billingCycle);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const symbol = CURRENCY_SYMBOL[sub.currency] ?? sub.currency;

  function handleToggle() {
    startTransition(async () => {
      await toggleSubscriptionActive(sub.id, !sub.isActive);
    });
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar "${sub.serviceName}" de tus suscripciones?`)) return;
    startTransition(async () => {
      await deleteTrackedSubscription(sub.id);
    });
  }

  function handleMarkPaid() {
    if (!confirm(`¿Marcar "${sub.serviceName}" como pagada este ciclo? El próximo cobro pasará al siguiente periodo.`)) {
      return;
    }
    startTransition(async () => {
      await markSubscriptionPaid(sub.id);
    });
  }

  async function handleSaveEdit(formData: FormData) {
    setError("");
    startTransition(async () => {
      try {
        await updateTrackedSubscription(sub.id, formData);
        setIsEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar el cambio.");
      }
    });
  }

  if (isEditing) {
    return (
      <form
        ref={formRef}
        action={handleSaveEdit}
        className="grid gap-3 rounded-2xl border border-[#60A5FA]/30 bg-[#60A5FA]/5 p-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-white/50">Servicio</label>
          <input
            name="service_name"
            defaultValue={sub.serviceName}
            required
            className="min-h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#4ADE80]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/50">Monto</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            defaultValue={sub.amount}
            required
            className="min-h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#4ADE80]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/50">Moneda</label>
          <select
            name="currency"
            defaultValue={sub.currency}
            className="min-h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
          >
            <option value="PEN" className="bg-[#0B0F14]">PEN</option>
            <option value="USD" className="bg-[#0B0F14]">USD</option>
            <option value="USDT" className="bg-[#0B0F14]">USDT</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/50">Ciclo</label>
          <select
            name="billing_cycle"
            value={cycle}
            onChange={(e) => setCycle(e.target.value)}
            className="min-h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
          >
            <option value="mensual" className="bg-[#0B0F14]">Mensual</option>
            <option value="anual" className="bg-[#0B0F14]">Anual</option>
            <option value="semanal" className="bg-[#0B0F14]">Semanal</option>
          </select>
        </div>

        {cycle === "mensual" ? (
          <div>
            <label className="mb-1 block text-xs text-white/50">Se paga cada día</label>
            <input
              name="billing_day"
              type="number"
              min={1}
              max={31}
              defaultValue={sub.billingDay ?? ""}
              required
              className="min-h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#4ADE80]"
            />
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs text-white/50">Próximo cobro</label>
            <input
              name="next_charge_date"
              type="date"
              defaultValue={sub.nextChargeDate}
              required
              className="min-h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#4ADE80]"
            />
          </div>
        )}

        {error && <p className="sm:col-span-2 text-xs text-[#F87171]">{error}</p>}

        <div className="sm:col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="min-h-9 rounded-lg bg-[#4ADE80] px-4 py-2 text-sm font-semibold text-[#0B0F14] disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="min-h-9 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-4 ${
        sub.isActive ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-[#E5E7EB]">{sub.serviceName}</p>
            {sub.possibleDuplicateOf.length > 0 && (
              <span className="shrink-0 rounded-full border border-[#FBBF24]/40 bg-[#FBBF24]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FBBF24]">
                Posible duplicado de {sub.possibleDuplicateOf.join(", ")}
              </span>
            )}
            {!sub.isActive && (
              <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/40">
                Inactiva
              </span>
            )}
            {sub.isActive && sub.daysUntilCharge <= 7 && (
              <span className="shrink-0 rounded-full border border-[#60A5FA]/40 bg-[#60A5FA]/10 px-2 py-0.5 text-[10px] font-semibold text-[#60A5FA]">
                {sub.daysUntilCharge === 0 ? "Cobra hoy" : `En ${sub.daysUntilCharge} días`}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/50">
            {symbol}{sub.amount.toFixed(2)} {CYCLE_LABEL[sub.billingCycle] ?? ""}
            {sub.billingCycle === "mensual" && sub.billingDay
              ? ` · Se paga cada día ${sub.billingDay}`
              : ""}
            {" · "}Próximo cobro: {new Date(sub.nextChargeDate + "T12:00:00").toLocaleDateString("es-PE")}
          </p>
          {sub.billingCycle !== "mensual" && (
            <p className="mt-0.5 text-xs text-white/30">
              Equivalente mensual: {symbol}{sub.monthlyEquivalent.toFixed(2)}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-[#60A5FA] hover:text-[#60A5FA]"
            >
              Editar
            </button>
            <button
              onClick={handleToggle}
              disabled={isPending}
              className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-[#4ADE80] hover:text-[#4ADE80] disabled:opacity-50"
            >
              {sub.isActive ? "Pausar" : "Reactivar"}
            </button>
          </div>
          {sub.isActive && (
            <button
              onClick={handleMarkPaid}
              disabled={isPending}
              className="rounded-lg bg-[#4ADE80]/10 px-3 py-1 text-xs font-semibold text-[#4ADE80] hover:bg-[#4ADE80]/20 disabled:opacity-50"
            >
              Marcar como pagado
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs text-white/40 hover:text-[#F87171] disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
