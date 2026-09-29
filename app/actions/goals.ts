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

export async function createGoal(formData: FormData) {
  const { supabase, userId } = await requireActiveUser();

  const name = String(formData.get("name") ?? "").trim();
  const targetAmount = Number(String(formData.get("target_amount") ?? "").replace(",", "."));
  const currentAmount = Number(String(formData.get("current_amount") ?? "0").replace(",", "."));
  const currency = String(formData.get("currency") ?? "PEN");
  const targetDateRaw = String(formData.get("target_date") ?? "");

  if (!name) throw new Error("El nombre de la meta es obligatorio.");
  if (Number.isNaN(targetAmount) || targetAmount <= 0) {
    throw new Error("El monto objetivo debe ser mayor a cero.");
  }
  if (Number.isNaN(currentAmount) || currentAmount < 0) {
    throw new Error("El monto actual no puede ser negativo.");
  }
  if (!["PEN", "USD", "USDT"].includes(currency)) throw new Error("Moneda inválida.");

  const { error } = await supabase.from("goals").insert({
    user_id: userId,
    name,
    target_amount: targetAmount,
    current_amount: currentAmount,
    currency,
    target_date: targetDateRaw || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/goals");
}

export async function addGoalContribution(goalId: string, amount: number) {
  const { supabase, userId } = await requireActiveUser();

  if (Number.isNaN(amount) || amount === 0) {
    throw new Error("Ingresa un monto válido distinto de cero.");
  }

  const { data: goal, error: readError } = await supabase
    .from("goals")
    .select("current_amount, target_amount")
    .eq("id", goalId)
    .eq("user_id", userId)
    .single();

  if (readError || !goal) throw new Error("Meta no encontrada.");

  const newAmount = Math.max(0, Number(goal.current_amount) + amount);

  const { error } = await supabase
    .from("goals")
    .update({ current_amount: newAmount })
    .eq("id", goalId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/goals");
}

export async function deleteGoal(goalId: string) {
  const { supabase, userId } = await requireActiveUser();

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/goals");
}

export type GoalWithProjection = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate: string | null;
  percentage: number;
  remaining: number;
  projectedMonthsLeft: number | null;
  projectedCompletionDate: string | null;
  onTrack: boolean | null;
};

/**
 * Calcula el ahorro promedio mensual real del usuario (ingresos - gastos
 * de los últimos 3 meses completos) para proyectar cuándo se alcanzará
 * cada meta al ritmo actual de ahorro.
 */
export async function getGoalsWithProjection(): Promise<GoalWithProjection[]> {
  const { supabase, userId } = await requireActiveUser();

  const { data: goals, error: goalsError } = await supabase
    .from("goals")
    .select("id, name, target_amount, current_amount, currency, target_date")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (goalsError) throw new Error(goalsError.message);
  if (!goals || goals.length === 0) return [];

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, type, currency")
    .eq("user_id", userId)
    .eq("currency", "PEN")
    .gte("occurred_at", threeMonthsAgo.toISOString());

  let netSavings = 0;
  for (const tx of transactions ?? []) {
    netSavings += tx.type === "ingreso" ? Number(tx.amount) : -Number(tx.amount);
  }
  const avgMonthlySavings = netSavings / 3;

  return goals.map((g) => {
    const targetAmount = Number(g.target_amount);
    const currentAmount = Number(g.current_amount);
    const remaining = Math.max(0, targetAmount - currentAmount);
    const percentage = targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;

    let projectedMonthsLeft: number | null = null;
    let projectedCompletionDate: string | null = null;
    let onTrack: boolean | null = null;

    if (g.currency === "PEN" && avgMonthlySavings > 0 && remaining > 0) {
      projectedMonthsLeft = Math.ceil(remaining / avgMonthlySavings);
      const projected = new Date();
      projected.setMonth(projected.getMonth() + projectedMonthsLeft);
      projectedCompletionDate = projected.toISOString().slice(0, 10);

      if (g.target_date) {
        onTrack = new Date(projectedCompletionDate) <= new Date(g.target_date);
      }
    } else if (remaining === 0) {
      onTrack = true;
    }

    return {
      id: g.id,
      name: g.name,
      targetAmount,
      currentAmount,
      currency: g.currency,
      targetDate: g.target_date,
      percentage,
      remaining,
      projectedMonthsLeft,
      projectedCompletionDate,
      onTrack,
    };
  });
}
