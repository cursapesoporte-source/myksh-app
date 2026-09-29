"use server";

import { createClient } from "@/lib/supabase/server";
import { convertToBaseCurrency } from "@/lib/market-data/currency-converter";
import type { MarketCurrency } from "@/lib/market-data/types";

export type PerformanceFilterType = "all" | "accion" | "fondo" | "cripto" | "plazo_fijo" | "inmueble";
export type PerformanceFilterCurrency = "all" | MarketCurrency;

type HistoryRow = { investment_id: string; price: number | string; currency: string; captured_at: string };
type InvestmentRef = { id: string; asset_type: string; quantity: number | string; currency: string; ticker: string | null };

export type MonthlyReturnPoint = {
  month: string; label: string; startValue: number; endValue: number; change: number;
  changePct: number | null; referenceValue: number; referenceChange: number; baseCurrency: MarketCurrency;
};
export type PortfolioHistoryPoint = { date: string; label: string; value: number; referenceValue: number; baseCurrency: MarketCurrency; assetsIncluded: number };
export type InvestmentPerformanceResult = { monthlyReturns: MonthlyReturnPoint[]; portfolioHistory: PortfolioHistoryPoint[]; baseCurrency: MarketCurrency; historyPointCount: number; monthlyPointCount: number };

function baseCurrencyOf(value: string): MarketCurrency {
  const code = value.toUpperCase();
  return code === "USD" || code === "USDT" ? code : "PEN";
}
function dateKey(value: string) { return value.slice(0, 10); }
function monthKey(value: string) { return value.slice(0, 7); }
function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export async function getInvestmentPerformance(
  requestedBaseCurrency = "PEN",
  typeFilter: PerformanceFilterType = "all",
  currencyFilter: PerformanceFilterCurrency = "all",
  benchmarkAnnualPct = 5,
): Promise<InvestmentPerformanceResult> {
  const baseCurrency = baseCurrencyOf(requestedBaseCurrency);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Debes iniciar sesión para consultar el rendimiento.");

  const [{ data: investments, error: investmentsError }, { data: history, error: historyError }] = await Promise.all([
    supabase.from("investments").select("id, asset_type, quantity, currency, ticker").eq("user_id", auth.user.id),
    supabase.from("investment_price_history").select("investment_id, price, currency, captured_at").eq("user_id", auth.user.id).order("captured_at", { ascending: true }),
  ]);
  if (investmentsError) throw new Error(investmentsError.message);
  if (historyError) throw new Error(historyError.message);

  const selected = (investments ?? []).filter((investment) =>
    (typeFilter === "all" || investment.asset_type === typeFilter) &&
    (currencyFilter === "all" || investment.currency === currencyFilter),
  ) as InvestmentRef[];
  const map = new Map(selected.map((investment) => [investment.id, investment]));
  const daily = new Map<string, { value: number; assets: Set<string> }>();

  for (const row of (history ?? []) as HistoryRow[]) {
    const investment = map.get(row.investment_id);
    if (!investment) continue;
    try {
      // Importante: se usa el precio guardado en el snapshot, no el precio actual de Binance.
      const amount = Number(row.price) * Number(investment.quantity);
      const conversion = await convertToBaseCurrency(amount, row.currency as MarketCurrency, baseCurrency);
      const key = dateKey(row.captured_at);
      const item = daily.get(key) ?? { value: 0, assets: new Set<string>() };
      item.value += conversion.amount;
      item.assets.add(investment.id);
      daily.set(key, item);
    } catch { /* Se excluye únicamente el snapshot sin conversión disponible. */ }
  }

  const historyPoints = Array.from(daily.entries()).sort(([a], [b]) => a.localeCompare(b));
  const portfolioHistory = historyPoints.map(([date, point]) => ({
    date, label: dateLabel(date), value: Math.round(point.value * 100) / 100,
    referenceValue: Math.round(point.value * Math.pow(1 + benchmarkAnnualPct / 100, 1 / 365.25) * 100) / 100,
    baseCurrency, assetsIncluded: point.assets.size,
  }));

  const monthlyMap = new Map<string, { first: number; last: number }>();
  for (const point of portfolioHistory) {
    const key = monthKey(point.date);
    const current = monthlyMap.get(key);
    if (!current) monthlyMap.set(key, { first: point.value, last: point.value });
    else current.last = point.value;
  }

  const monthlyReturns = Array.from(monthlyMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, values]) => {
    const change = values.last - values.first;
    const referenceChange = values.first * (benchmarkAnnualPct / 100) / 12;
    return {
      month, label: monthLabel(month), startValue: Math.round(values.first * 100) / 100,
      endValue: Math.round(values.last * 100) / 100, change: Math.round(change * 100) / 100,
      changePct: values.first > 0 ? Math.round((change / values.first) * 10000) / 100 : null,
      referenceValue: Math.round((values.first + referenceChange) * 100) / 100,
      referenceChange: Math.round(referenceChange * 100) / 100, baseCurrency,
    };
  });

  return { monthlyReturns, portfolioHistory, baseCurrency, historyPointCount: portfolioHistory.length, monthlyPointCount: monthlyReturns.length };
}
