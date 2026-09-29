"use client";

import { useState, useTransition } from "react";
import { deleteExchangeRate, upsertExchangeRate } from "@/app/actions/exchange-rates";
import type { Currency, ExchangeRateRow } from "@/lib/currency";

const CURRENCIES: Currency[] = ["PEN", "USD", "USDT"];

export default function ExchangeRatesPanel({ initialRates }: { initialRates: ExchangeRateRow[] }) {
  const [base, setBase] = useState<Currency>("PEN");
  const [quote, setQuote] = useState<Currency>("USD");
  const [rate, setRate] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function save() {
    const value = Number(rate.replace(",", "."));
    setError("");
    startTransition(async () => {
      try {
        await upsertExchangeRate(base, quote, value);
        setRate("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar la tasa.");
      }
    });
  }

  function remove(row: ExchangeRateRow) {
    startTransition(async () => {
      await deleteExchangeRate(row.baseCurrency, row.quoteCurrency);
    });
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-semibold">Tasas de cambio</h2>
      <p className="mt-1 text-xs text-white/50">
        Define cuánto vale una unidad de la primera moneda en la segunda. Ejemplo: 1 USD = 3.75 PEN.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <select value={base} onChange={(e) => setBase(e.target.value as Currency)} className="min-h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-[#E5E7EB]">
          {CURRENCIES.map((c) => <option key={c} value={c} className="bg-[#0B0F14]">{c}</option>)}
        </select>
        <select value={quote} onChange={(e) => setQuote(e.target.value as Currency)} className="min-h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-[#E5E7EB]">
          {CURRENCIES.map((c) => <option key={c} value={c} className="bg-[#0B0F14]">{c}</option>)}
        </select>
        <input type="number" step="0.00000001" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Ej. 3.75" className="min-h-10 rounded-xl border border-white/10 bg-black/20 px-3 outline-none focus:border-[#4ADE80]" />
      </div>

      <button onClick={save} disabled={isPending} className="mt-3 min-h-10 rounded-xl bg-[#4ADE80] px-4 font-semibold text-[#0B0F14] disabled:opacity-50">
        Guardar tasa
      </button>
      {error && <p className="mt-2 text-xs text-[#F87171]">{error}</p>}

      <div className="mt-4 grid gap-2">
        {initialRates.length === 0 ? (
          <p className="text-xs text-white/40">No hay tasas configuradas todavía.</p>
        ) : initialRates.map((row) => (
          <div key={`${row.baseCurrency}-${row.quoteCurrency}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
            <span>1 {row.baseCurrency} = {row.rate} {row.quoteCurrency}</span>
            <button onClick={() => remove(row)} className="text-xs text-white/40 hover:text-[#F87171]">Eliminar</button>
          </div>
        ))}
      </div>
    </section>
  );
}
