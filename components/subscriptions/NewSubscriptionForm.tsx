"use client";

import { useRef, useState } from "react";
import { createTrackedSubscription } from "@/app/actions/subscriptions";

export default function NewSubscriptionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cycle, setCycle] = useState("mensual");

  async function handleAction(formData: FormData) {
    setError("");
    setLoading(true);
    try {
      await createTrackedSubscription(formData);
      formRef.current?.reset();
      setCycle("mensual");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la suscripción.");
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
        <label htmlFor="service_name" className="mb-2 block text-sm">Servicio</label>
        <input
          id="service_name"
          name="service_name"
          required
          placeholder="Ej. Netflix, Spotify, Gimnasio..."
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]"
        />
      </div>

      <div>
        <label htmlFor="amount" className="mb-2 block text-sm">Monto</label>
        <input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          required
          placeholder="29.90"
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
        <label htmlFor="billing_cycle" className="mb-2 block text-sm">Ciclo de cobro</label>
        <select
          id="billing_cycle"
          name="billing_cycle"
          value={cycle}
          onChange={(e) => setCycle(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
        >
          <option value="mensual" className="bg-[#0B0F14]">Mensual</option>
          <option value="anual" className="bg-[#0B0F14]">Anual</option>
          <option value="semanal" className="bg-[#0B0F14]">Semanal</option>
        </select>
      </div>

      {cycle === "mensual" ? (
        <div>
          <label htmlFor="billing_day" className="mb-2 block text-sm">
            Se paga cada día <span className="text-[#F87171]">*</span>
          </label>
          <input
            id="billing_day"
            name="billing_day"
            type="number"
            min={1}
            max={31}
            required
            placeholder="Ej. 17"
            className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]"
          />
          <p className="mt-2 text-xs text-white/40">
            Solo el número del día (1 a 31). El sistema calcula automáticamente cuándo es el
            próximo cobro y lo actualiza solo cada mes.
          </p>
        </div>
      ) : (
        <div>
          <label htmlFor="next_charge_date" className="mb-2 block text-sm">
            Próxima fecha de cobro <span className="text-[#F87171]">*</span>
          </label>
          <input
            id="next_charge_date"
            name="next_charge_date"
            type="date"
            required
            className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[#4ADE80]"
          />
        </div>
      )}

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
        {loading ? "Guardando..." : "Agregar suscripción"}
      </button>
    </form>
  );
}
