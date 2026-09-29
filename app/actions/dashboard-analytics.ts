"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireActiveUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

/**
 * Patrimonio neto. LIMITACIÓN CONOCIDA: por ahora solo suma activos y
 * cuentas en PEN. Si tienes cuentas o inversiones en USD/USDT, no se
 * incluyen todavía (falta la tasa de cambio editable del blueprint,
 * pendiente de implementar). El total se etiqueta explícitamente
 * "(solo PEN)" en la UI para no confundir.
 */
export async function getNetWorthPEN(): Promise<{
  accountsTotal: number;
  investmentsTotal: number;
  netWorth: number;
}> {
  const { supabase, userId } = await requireActiveUser();

  const [{ data: accounts }, { data: investments }] = await Promise.all([
    supabase.from("accounts").select("balance, currency").eq("user_id", userId).eq("currency", "PEN"),
    supabase
      .from("investments")
      .select("quantity, current_price, currency")
      .eq("user_id", userId)
      .eq("currency", "PEN"),
  ]);

  const accountsTotal = (accounts ?? []).reduce((sum, a) => sum + Number(a.balance), 0);
  const investmentsTotal = (investments ?? []).reduce(
    (sum, i) => sum + Number(i.quantity) * Number(i.current_price),
    0
  );

  return {
    accountsTotal: Math.round(accountsTotal * 100) / 100,
    investmentsTotal: Math.round(investmentsTotal * 100) / 100,
    netWorth: Math.round((accountsTotal + investmentsTotal) * 100) / 100,
  };
}

export type MonthlyFlowPoint = { monthLabel: string; ingresos: number; gastos: number };

/** Flujo de ingresos vs gastos (PEN) de los últimos 6 meses, incluido el actual. */
export async function getMonthlyFlow(): Promise<MonthlyFlowPoint[]> {
  const { supabase, userId } = await requireActiveUser();

  const now = new Date();
  const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("amount, type, occurred_at")
    .eq("user_id", userId)
    .eq("currency", "PEN")
    .gte("occurred_at", sixMonthsAgoStart.toISOString());

  if (error) throw new Error(error.message);

  const buckets = new Map<string, { ingresos: number; gastos: number }>();
  const monthKeys: string[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthKeys.push(key);
    buckets.set(key, { ingresos: 0, gastos: 0 });
  }

  for (const tx of transactions ?? []) {
    const d = new Date(tx.occurred_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (tx.type === "ingreso") bucket.ingresos += Number(tx.amount);
    else bucket.gastos += Number(tx.amount);
  }

  return monthKeys.map((key) => {
    const [year, month] = key.split("-").map(Number);
    const label = new Date(year, month - 1, 1).toLocaleDateString("es-PE", {
      month: "short",
      year: "2-digit",
    });
    const bucket = buckets.get(key)!;
    return {
      monthLabel: label,
      ingresos: Math.round(bucket.ingresos * 100) / 100,
      gastos: Math.round(bucket.gastos * 100) / 100,
    };
  });
}

export type TopCategory = { categoryName: string; total: number };

/** Top 3 categorías de gasto (PEN) del mes en curso. */
export async function getTopExpenseCategories(): Promise<TopCategory[]> {
  const { supabase, userId } = await requireActiveUser();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, category_id, categories(name)")
    .eq("user_id", userId)
    .eq("currency", "PEN")
    .eq("type", "gasto")
    .gte("occurred_at", monthStart)
    .lt("occurred_at", monthEnd);

  if (error) throw new Error(error.message);

  const totals = new Map<string, number>();
  for (const tx of data ?? []) {
    const categoryRel = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories;
    const name = categoryRel?.name ?? "Sin categoría";
    totals.set(name, (totals.get(name) ?? 0) + Number(tx.amount));
  }

  return Array.from(totals.entries())
    .map(([categoryName, total]) => ({ categoryName, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);
}
