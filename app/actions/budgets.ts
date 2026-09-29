"use server";

import { revalidatePath } from "next/cache";
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

export async function createBudget(formData: FormData) {
  const { supabase, userId } = await requireActiveUser();

  const categoryId = String(formData.get("category_id") ?? "");
  const monthlyLimitRaw = String(formData.get("monthly_limit") ?? "");
  const monthlyLimit = Number(monthlyLimitRaw.replace(",", "."));
  const currency = String(formData.get("currency") ?? "PEN");

  if (!categoryId) throw new Error("Selecciona una categoría.");
  if (Number.isNaN(monthlyLimit) || monthlyLimit <= 0) {
    throw new Error("El límite mensual debe ser un número mayor a cero.");
  }
  if (!["PEN", "USD", "USDT"].includes(currency)) {
    throw new Error("Moneda inválida.");
  }

  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: userId,
      category_id: categoryId,
      monthly_limit: monthlyLimit,
      currency,
    },
    { onConflict: "user_id,category_id,currency" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/budgets");
}

export async function updateBudgetLimit(budgetId: string, monthlyLimit: number) {
  const { supabase, userId } = await requireActiveUser();

  if (Number.isNaN(monthlyLimit) || monthlyLimit <= 0) {
    throw new Error("El límite mensual debe ser un número mayor a cero.");
  }

  const { error } = await supabase
    .from("budgets")
    .update({ monthly_limit: monthlyLimit })
    .eq("id", budgetId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/budgets");
}

export async function deleteBudget(budgetId: string) {
  const { supabase, userId } = await requireActiveUser();

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", budgetId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/budgets");
}

export type BudgetProgress = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  monthlyLimit: number;
  currency: string;
  spent: number;
  percentage: number;
  remaining: number;
};

/**
 * Calcula el gasto real del mes actual por categoría y lo compara
 * contra el límite definido en `budgets`. Se ejecuta en el servidor
 * para no exponer lógica de agregación al cliente.
 */
export async function getBudgetsWithProgress(): Promise<BudgetProgress[]> {
  const { supabase, userId } = await requireActiveUser();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const { data: budgets, error: budgetsError } = await supabase
    .from("budgets")
    .select("id, category_id, monthly_limit, currency, categories(name, icon)")
    .eq("user_id", userId);

  if (budgetsError) throw new Error(budgetsError.message);
  if (!budgets || budgets.length === 0) return [];

  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("category_id, amount, currency, type")
    .eq("user_id", userId)
    .eq("type", "gasto")
    .gte("occurred_at", monthStart)
    .lt("occurred_at", monthEnd);

  if (txError) throw new Error(txError.message);

  const spentByCategory = new Map<string, number>();
  for (const tx of transactions ?? []) {
    if (!tx.category_id) continue;
    const key = `${tx.category_id}|${tx.currency}`;
    spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + Number(tx.amount));
  }

  return budgets.map((b) => {
    // Supabase puede devolver categories como objeto o array según el join;
    // normalizamos ambos casos.
    const categoryRel = Array.isArray(b.categories) ? b.categories[0] : b.categories;
    const spent = spentByCategory.get(`${b.category_id}|${b.currency}`) ?? 0;
    const monthlyLimit = Number(b.monthly_limit);
    const percentage = monthlyLimit > 0 ? Math.round((spent / monthlyLimit) * 100) : 0;

    return {
      id: b.id,
      categoryId: b.category_id,
      categoryName: categoryRel?.name ?? "Sin categoría",
      categoryIcon: categoryRel?.icon ?? "tag",
      monthlyLimit,
      currency: b.currency,
      spent: Math.round(spent * 100) / 100,
      percentage,
      remaining: Math.round((monthlyLimit - spent) * 100) / 100,
    };
  });
}

export async function getExpenseCategories() {
  const { supabase, userId } = await requireActiveUser();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon")
    .eq("type", "gasto")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}
