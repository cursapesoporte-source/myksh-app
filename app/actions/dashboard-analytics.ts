"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { convertToBaseCurrency, valueCryptoInBaseCurrency } from "@/lib/market-data/currency-converter";
import type { MarketCurrency } from "@/lib/market-data/types";

async function requireActiveUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

function asCurrency(value: unknown): MarketCurrency {
  const currency = String(value ?? "PEN").toUpperCase();
  return currency === "USD" || currency === "USDT" ? currency : "PEN";
}

export async function getNetWorthPEN(): Promise<{ accountsTotal: number; investmentsTotal: number; netWorth: number }> {
  const { supabase, userId } = await requireActiveUser();
  const [{ data: accounts, error: accountsError }, { data: investments, error: investmentsError }] = await Promise.all([
    supabase.from("accounts").select("balance, currency").eq("user_id", userId),
    supabase.from("investments").select("quantity, current_price, currency, asset_type, ticker").eq("user_id", userId),
  ]);
  if (accountsError) throw new Error(accountsError.message);
  if (investmentsError) throw new Error(investmentsError.message);

  let accountsTotal = 0;
  for (const account of accounts ?? []) {
    const conversion = await convertToBaseCurrency(Number(account.balance ?? 0), asCurrency(account.currency), "PEN");
    accountsTotal += conversion.amount;
  }

  let investmentsTotal = 0;
  for (const investment of investments ?? []) {
    const quantity = Number(investment.quantity ?? 0);
    const currentPrice = Number(investment.current_price ?? 0);
    if (!Number.isFinite(quantity) || !Number.isFinite(currentPrice)) continue;

    const conversion = String(investment.asset_type ?? "").toLowerCase() === "cripto" && investment.ticker
      ? await valueCryptoInBaseCurrency(quantity, String(investment.ticker), "PEN", false)
      : await convertToBaseCurrency(quantity * currentPrice, asCurrency(investment.currency), "PEN");
    investmentsTotal += conversion.amount;
  }

  accountsTotal = Math.round(accountsTotal * 100) / 100;
  investmentsTotal = Math.round(investmentsTotal * 100) / 100;
  return { accountsTotal, investmentsTotal, netWorth: Math.round((accountsTotal + investmentsTotal) * 100) / 100 };
}

export type MonthlyFlowPoint = { monthLabel: string; ingresos: number; gastos: number };

export async function getMonthlyFlow(): Promise<MonthlyFlowPoint[]> {
  const { supabase, userId } = await requireActiveUser();
  const now = new Date();
  const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const { data: transactions, error } = await supabase.from("transactions").select("amount, type, occurred_at, excluded_from_reports").eq("user_id", userId).eq("currency", "PEN").or("excluded_from_reports.is.null,excluded_from_reports.eq.false").gte("occurred_at", sixMonthsAgoStart.toISOString());
  if (error) throw new Error(error.message);

  const buckets = new Map<string, { ingresos: number; gastos: number }>();
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthKeys.push(key);
    buckets.set(key, { ingresos: 0, gastos: 0 });
  }
  for (const transaction of transactions ?? []) {
    const date = new Date(transaction.occurred_at);
    const bucket = buckets.get(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    if (!bucket) continue;
    if (transaction.type === "ingreso") bucket.ingresos += Number(transaction.amount ?? 0);
    else bucket.gastos += Number(transaction.amount ?? 0);
  }
  return monthKeys.map((key) => {
    const [year, month] = key.split("-").map(Number);
    const bucket = buckets.get(key)!;
    return { monthLabel: new Date(year, month - 1, 1).toLocaleDateString("es-PE", { month: "short", year: "2-digit" }), ingresos: Math.round(bucket.ingresos * 100) / 100, gastos: Math.round(bucket.gastos * 100) / 100 };
  });
}

export type TopCategory = { categoryName: string; total: number };

export async function getTopExpenseCategories(): Promise<TopCategory[]> {
  const { supabase, userId } = await requireActiveUser();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  const [{ data, error }, { data: categories }] = await Promise.all([
    supabase.from("transactions").select("amount, category_id, currency, type, excluded_from_reports").eq("user_id", userId).eq("currency", "PEN").eq("type", "gasto").or("excluded_from_reports.is.null,excluded_from_reports.eq.false").gte("occurred_at", monthStart).lt("occurred_at", monthEnd),
    supabase.from("categories").select("id, name"),
  ]);
  if (error) throw new Error(error.message);
  const names = new Map((categories ?? []).map((category) => [category.id, category.name]));
  const totals = new Map<string, number>();
  for (const transaction of data ?? []) {
    const key = transaction.category_id ?? "uncategorized";
    totals.set(key, (totals.get(key) ?? 0) + Number(transaction.amount ?? 0));
  }
  return Array.from(totals, ([categoryId, total]) => ({ categoryName: names.get(categoryId) ?? "Sin categoría", total: Math.round(total * 100) / 100 })).sort((a, b) => b.total - a.total).slice(0, 3);
}
