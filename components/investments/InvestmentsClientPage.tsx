"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { getInvestments, type InvestmentRowData } from "@/app/actions/investments";
import { getAutomaticInvestmentValuation, type AutomaticInvestmentValuation } from "@/app/actions/automatic-valuation";
import { syncInvestmentMarketPrices } from "@/app/actions/sync-investment-market-prices";
import { getMultiCurrencyInvestmentAllocation, type InvestmentFilterCurrency, type InvestmentFilterType, type MultiCurrencyAllocationResult } from "@/app/actions/allocation-multicurrency-actions";
import { getInvestmentPerformance, type InvestmentPerformanceResult } from "@/app/actions/investment-performance";
import NewInvestmentForm from "@/components/investments/NewInvestmentForm";
import InvestmentRow from "@/components/investments/InvestmentRow";
import AllocationPieChartMultiCurrency from "@/components/investments/AllocationPieChartMultiCurrency";
import AllocationByTypeChart from "@/components/investments/AllocationByTypeChart";
import AutomaticValuationPanel from "@/components/investments/AutomaticValuationPanel";
import MonthlyReturnChart from "@/components/investments/MonthlyReturnChart";
import PortfolioHistoryChart from "@/components/investments/PortfolioHistoryChart";

const TYPE_LABELS: Record<string, string> = { all: "Todos los tipos", accion: "Acciones", fondo: "Fondos", cripto: "Cripto", plazo_fijo: "Plazo fijo", inmueble: "Inmuebles" };

export default function InvestmentsClientPage({ initialInvestments, initialMultiCurrencyAllocation, initialPerformance }: { initialInvestments: InvestmentRowData[]; initialAllocation: unknown[]; initialRates: unknown[]; initialMultiCurrencyAllocation: MultiCurrencyAllocationResult; initialPerformance: InvestmentPerformanceResult }) {
  const [benchmark, setBenchmark] = useState("5");
  const [typeFilter, setTypeFilter] = useState<InvestmentFilterType>("all");
  const [currencyFilter, setCurrencyFilter] = useState<InvestmentFilterCurrency>("all");
  const [investments, setInvestments] = useState(initialInvestments);
  const [valuation, setValuation] = useState<AutomaticInvestmentValuation[]>([]);
  const [allocation, setAllocation] = useState(initialMultiCurrencyAllocation);
  const [performance, setPerformance] = useState(initialPerformance);
  const [isSyncing, startSync] = useTransition();
  const [syncMessage, setSyncMessage] = useState("");

  const benchmarkValue = Number(benchmark.replace(",", ".")) || 0;
  const refreshAll = useCallback(async () => {
    const [inv, currentValuation, currentAllocation, currentPerformance] = await Promise.all([
      getInvestments(),
      getAutomaticInvestmentValuation("PEN"),
      getMultiCurrencyInvestmentAllocation("PEN", typeFilter, currencyFilter),
      getInvestmentPerformance("PEN", typeFilter, currencyFilter, benchmarkValue),
    ]);
    setInvestments(inv); setValuation(currentValuation); setAllocation(currentAllocation); setPerformance(currentPerformance);
  }, [benchmarkValue, currencyFilter, typeFilter]);

  useEffect(() => { refreshAll().catch(() => undefined); }, [refreshAll]);
  useEffect(() => { const handleFocus = () => refreshAll().catch(() => undefined); window.addEventListener("focus", handleFocus); return () => window.removeEventListener("focus", handleFocus); }, [refreshAll]);

  function syncPrices() { setSyncMessage(""); startSync(async () => { try { const synced = await syncInvestmentMarketPrices(); await refreshAll(); setSyncMessage(synced.length ? `${synced.length} precio(s) actualizado(s) desde Binance.` : "No hay activos cripto con ticker configurado."); } catch (error) { setSyncMessage(error instanceof Error ? error.message : "No se pudieron actualizar los precios."); } }); }

  const visibleInvestments = useMemo(() => investments.filter((item) => (typeFilter === "all" || item.assetType === typeFilter) && (currencyFilter === "all" || item.currency === currencyFilter)), [currencyFilter, investments, typeFilter]);
  const filteredValuation = valuation.filter((row) => { const item = investments.find((investment) => investment.id === row.investmentId); return item && (typeFilter === "all" || item.assetType === typeFilter) && (currencyFilter === "all" || item.currency === currencyFilter); });
  const totalAutomaticPEN = filteredValuation.reduce((sum, row) => sum + (row.baseValue ?? 0), 0);
  const pendingConversions = filteredValuation.filter((row) => row.baseValue === null).length;

  return <main className="min-h-screen bg-[#0B0F14] px-4 py-6 text-[#E5E7EB] sm:px-6 sm:py-10"><div className="mx-auto max-w-5xl">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium uppercase tracking-[0.25em] text-[#4ADE80]">MYKSH</p><h1 className="mt-2 text-3xl font-semibold">Inversiones</h1></div><Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm hover:border-[#4ADE80] hover:text-[#4ADE80]">Volver al dashboard</Link></div>
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"><button onClick={syncPrices} disabled={isSyncing} className="min-h-10 rounded-xl bg-[#4ADE80] px-4 font-semibold text-[#0B0F14] disabled:opacity-50">{isSyncing ? "Actualizando precios..." : "Actualizar precios de mercado"}</button><span className="text-xs text-white/50">Consulta activos cripto en Binance y actualiza sus tarjetas.</span>{syncMessage && <span className="w-full text-xs text-[#60A5FA]">{syncMessage}</span>}</div>
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex flex-wrap items-end gap-3"><div className="min-w-44 flex-1"><label className="mb-2 block text-xs text-white/50">Tipo de activo</label><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as InvestmentFilterType)} className="min-h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#4ADE80]">{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value} className="bg-[#0B0F14]">{label}</option>)}</select></div><div className="min-w-44 flex-1"><label className="mb-2 block text-xs text-white/50">Moneda original</label><select value={currencyFilter} onChange={(event) => setCurrencyFilter(event.target.value as InvestmentFilterCurrency)} className="min-h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#4ADE80]"><option value="all">Todas las monedas</option><option value="PEN">PEN</option><option value="USD">USD</option><option value="USDT">USDT</option></select></div><p className="text-xs text-white/40">Mostrando {visibleInvestments.length} de {investments.length} activos.</p></div></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-sm text-white/50">Valor automático (PEN)</p><p className="mt-1 text-2xl font-semibold">S/{totalAutomaticPEN.toFixed(2)}</p><p className="mt-1 text-xs text-white/40">Pendientes de conversión: {pendingConversions}</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-sm text-white/50">Activos visibles</p><p className="mt-1 text-2xl font-semibold">{visibleInvestments.length}</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-5"><label className="text-sm text-white/50">Tasa de referencia anual (%)</label><input type="number" step="0.1" value={benchmark} onChange={(event) => setBenchmark(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xl font-semibold outline-none focus:border-[#4ADE80]" /></div></div>
    <div className="mt-6"><AutomaticValuationPanel initialBaseCurrency="PEN" /></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><AllocationByTypeChart data={allocation.byType} baseCurrency={allocation.baseCurrency} /><AllocationPieChartMultiCurrency slices={allocation.slices} baseCurrency={allocation.baseCurrency} pendingCount={allocation.pendingCount} /></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><MonthlyReturnChart data={performance.monthlyReturns} baseCurrency={performance.baseCurrency} benchmarkAnnualPct={benchmarkValue} /><PortfolioHistoryChart data={performance.portfolioHistory} baseCurrency={performance.baseCurrency} benchmarkAnnualPct={benchmarkValue} /></div>
    <div className="mt-6"><NewInvestmentForm /></div><section className="mt-6 grid gap-3">{visibleInvestments.length ? visibleInvestments.map((item) => <InvestmentRow key={item.id} investment={item} benchmarkAnnualPct={benchmarkValue} />) : <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">No hay inversiones que coincidan con los filtros.</div>}</section>
  </div></main>;
}
