"use client";

import { useEffect, useState, useTransition } from "react";
import { getAutomaticInvestmentValuation, type AutomaticInvestmentValuation } from "@/app/actions/automatic-valuation";
import type { MarketCurrency } from "@/lib/market-data/types";

const CURRENCIES: MarketCurrency[] = ["PEN", "USD", "USDT"];

export default function AutomaticValuationPanel({ initialBaseCurrency = "PEN" }: { initialBaseCurrency?: MarketCurrency }) {
  const [baseCurrency, setBaseCurrency] = useState<MarketCurrency>(initialBaseCurrency);
  const [rows, setRows] = useState<AutomaticInvestmentValuation[]>([]);
  const [loading, startTransition] = useTransition();
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  function refresh(forceRefresh = false) {
    startTransition(async () => {
      const data = await getAutomaticInvestmentValuation(baseCurrency, forceRefresh);
      setRows(data);
      setUpdatedAt(new Date().toISOString());
    });
  }

  useEffect(() => {
    refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCurrency]);

  const convertedRows = rows.filter((row) => row.baseValue !== null);
  const pendingRows = rows.filter((row) => row.baseValue === null);
  const total = convertedRows.reduce((sum, row) => sum + (row.baseValue ?? 0), 0);

  return (
    <section className="rounded-2xl border border-[#60A5FA]/30 bg-[#60A5FA]/5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-semibold text-[#60A5FA]">Valoración automática</h2><p className="mt-1 text-xs text-white/50">Las tasas se consultan automáticamente según cada activo.</p></div>
        <select value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value as MarketCurrency)} className="min-h-10 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-[#E5E7EB]">
          {CURRENCIES.map((currency) => <option key={currency} value={currency} className="bg-[#0B0F14]">Moneda base: {currency}</option>)}
        </select>
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-white/50">Valor total convertido</p><p className="mt-1 text-2xl font-semibold text-[#E5E7EB]">{baseCurrency} {total.toFixed(2)}</p><p className="mt-1 text-xs text-white/40">Convertidos: {convertedRows.length} · Pendientes: {pendingRows.length}</p></div>
      <div className="mt-4 grid gap-2">{rows.map((row) => <div key={row.investmentId} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs"><div className="flex items-center justify-between gap-3"><span className="text-white/60">Original: {row.originalCurrency} {row.originalValue.toFixed(2)}</span>{row.baseValue !== null ? <span className="font-semibold text-[#4ADE80]">{baseCurrency} {row.baseValue.toFixed(2)}</span> : <span className="text-[#F87171]">Sin conversión</span>}</div>{row.conversion && <p className="mt-1 text-white/40">Ruta: {row.conversion.route.join(" → ")} · Fuente: {row.conversion.source}</p>}{row.error && <p className="mt-1 text-[#F87171]">{row.error}</p>}</div>)}</div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/40"><span>{updatedAt ? `Actualizado ${new Date(updatedAt).toLocaleTimeString("es-PE")}` : "Pendiente de actualización"}</span><button onClick={() => refresh(true)} disabled={loading} className="rounded-lg border border-white/10 px-3 py-1 text-white/60 hover:border-[#60A5FA] hover:text-[#60A5FA] disabled:opacity-50">{loading ? "Actualizando..." : "Actualizar valoración"}</button></div>
      {pendingRows.length > 0 && <p className="mt-3 text-xs text-[#FBBF24]">{pendingRows.length} activo(s) no pudieron convertirse; conservamos su valor original.</p>}
    </section>
  );
}
