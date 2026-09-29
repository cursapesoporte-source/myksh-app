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

// ============================================================
// Utilidades de fecha. El servidor (Vercel) corre en UTC; sin esta
// corrección, "hoy" calculado con `new Date()` puede adelantarse un
// día entero durante la noche en Perú (UTC-5). Todo el módulo usa
// SIEMPRE `todayInLima()` como referencia de "hoy", nunca `new Date()`
// directo para comparar días de calendario.
// ============================================================

function todayInLima(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = parts.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function dateAtDay(year: number, monthIndex: number, day: number): Date {
  const clampedDay = Math.min(day, daysInMonth(year, monthIndex));
  return new Date(year, monthIndex, clampedDay);
}

/** Primera ocurrencia del día de cobro que sea igual o posterior a `from`. */
function nextMonthlyOccurrenceOnOrAfter(billingDay: number, from: Date): Date {
  const candidateThisMonth = dateAtDay(from.getFullYear(), from.getMonth(), billingDay);
  if (candidateThisMonth >= from) return candidateThisMonth;
  return dateAtDay(from.getFullYear(), from.getMonth() + 1, billingDay);
}

/** Avanza `stored` un mes exacto respetando el día de cobro (para "marcar pagado"). */
function advanceOneMonthly(billingDay: number, stored: Date): Date {
  return dateAtDay(stored.getFullYear(), stored.getMonth() + 1, billingDay);
}

/** Repara una fecha vencida avanzándola ciclo a ciclo hasta llegar a hoy o más adelante. */
function rollForward(cycle: string, billingDay: number | null, stored: Date, today: Date): Date {
  let cur = stored;
  let guard = 0;
  while (cur < today && guard < 120) {
    if (cycle === "mensual" && billingDay) {
      cur = dateAtDay(cur.getFullYear(), cur.getMonth() + 1, billingDay);
    } else if (cycle === "anual") {
      cur = dateAtDay(cur.getFullYear() + 1, cur.getMonth(), cur.getDate());
    } else {
      // semanal
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 7);
    }
    guard++;
  }
  return cur;
}

function advanceOneCycle(cycle: string, billingDay: number | null, stored: Date): Date {
  if (cycle === "mensual" && billingDay) return advanceOneMonthly(billingDay, stored);
  if (cycle === "anual") return dateAtDay(stored.getFullYear() + 1, stored.getMonth(), stored.getDate());
  return new Date(stored.getFullYear(), stored.getMonth(), stored.getDate() + 7);
}

// ============================================================
// CRUD
// ============================================================

export async function createTrackedSubscription(formData: FormData) {
  const { supabase, userId } = await requireActiveUser();

  const serviceName = String(formData.get("service_name") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));
  const currency = String(formData.get("currency") ?? "PEN");
  const billingCycle = String(formData.get("billing_cycle") ?? "mensual");

  if (!serviceName) throw new Error("El nombre del servicio es obligatorio.");
  if (Number.isNaN(amount) || amount <= 0) throw new Error("El monto debe ser mayor a cero.");
  if (!["PEN", "USD", "USDT"].includes(currency)) throw new Error("Moneda inválida.");
  if (!["mensual", "anual", "semanal"].includes(billingCycle)) {
    throw new Error("Ciclo de facturación inválido.");
  }

  const today = todayInLima();
  let billingDay: number | null = null;
  let nextChargeDate: Date;

  if (billingCycle === "mensual") {
    const billingDayRaw = String(formData.get("billing_day") ?? "").trim();
    billingDay = Number(billingDayRaw);
    if (!billingDayRaw || Number.isNaN(billingDay) || billingDay < 1 || billingDay > 31) {
      throw new Error("Indica el día del mes en que se cobra (1 a 31).");
    }
    nextChargeDate = nextMonthlyOccurrenceOnOrAfter(billingDay, today);
  } else {
    const nextChargeRaw = String(formData.get("next_charge_date") ?? "").trim();
    if (!nextChargeRaw) throw new Error("Indica la próxima fecha de cobro.");
    nextChargeDate = parseDateOnly(nextChargeRaw);
  }

  const { error } = await supabase.from("subscriptions_tracked").insert({
    user_id: userId,
    service_name: serviceName,
    amount,
    currency,
    billing_cycle: billingCycle,
    billing_day: billingDay,
    next_charge_date: formatDateOnly(nextChargeDate),
    is_active: true,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}

export async function updateTrackedSubscription(subscriptionId: string, formData: FormData) {
  const { supabase, userId } = await requireActiveUser();

  const serviceName = String(formData.get("service_name") ?? "").trim();
  const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));
  const currency = String(formData.get("currency") ?? "PEN");
  const billingCycle = String(formData.get("billing_cycle") ?? "mensual");

  if (!serviceName) throw new Error("El nombre del servicio es obligatorio.");
  if (Number.isNaN(amount) || amount <= 0) throw new Error("El monto debe ser mayor a cero.");
  if (!["PEN", "USD", "USDT"].includes(currency)) throw new Error("Moneda inválida.");
  if (!["mensual", "anual", "semanal"].includes(billingCycle)) {
    throw new Error("Ciclo de facturación inválido.");
  }

  const today = todayInLima();
  let billingDay: number | null = null;
  let nextChargeDate: Date;

  if (billingCycle === "mensual") {
    const billingDayRaw = String(formData.get("billing_day") ?? "").trim();
    billingDay = Number(billingDayRaw);
    if (!billingDayRaw || Number.isNaN(billingDay) || billingDay < 1 || billingDay > 31) {
      throw new Error("Indica el día del mes en que se cobra (1 a 31).");
    }
    nextChargeDate = nextMonthlyOccurrenceOnOrAfter(billingDay, today);
  } else {
    const nextChargeRaw = String(formData.get("next_charge_date") ?? "").trim();
    if (!nextChargeRaw) throw new Error("Indica la próxima fecha de cobro.");
    nextChargeDate = parseDateOnly(nextChargeRaw);
  }

  const { error } = await supabase
    .from("subscriptions_tracked")
    .update({
      service_name: serviceName,
      amount,
      currency,
      billing_cycle: billingCycle,
      billing_day: billingDay,
      next_charge_date: formatDateOnly(nextChargeDate),
    })
    .eq("id", subscriptionId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}

/**
 * Marca el cobro actualmente mostrado como pagado: avanza next_charge_date
 * un ciclo completo hacia adelante, sin importar si la fecha natural
 * todavía no llegaba (permite marcar pagos adelantados).
 */
export async function markSubscriptionPaid(subscriptionId: string) {
  const { supabase, userId } = await requireActiveUser();

  const { data: sub, error: readError } = await supabase
    .from("subscriptions_tracked")
    .select("billing_cycle, billing_day, next_charge_date")
    .eq("id", subscriptionId)
    .eq("user_id", userId)
    .single();

  if (readError || !sub) throw new Error("Suscripción no encontrada.");

  const stored = parseDateOnly(sub.next_charge_date);
  const newDate = advanceOneCycle(sub.billing_cycle, sub.billing_day, stored);

  const { error } = await supabase
    .from("subscriptions_tracked")
    .update({ next_charge_date: formatDateOnly(newDate) })
    .eq("id", subscriptionId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}

export async function toggleSubscriptionActive(subscriptionId: string, isActive: boolean) {
  const { supabase, userId } = await requireActiveUser();

  const { error } = await supabase
    .from("subscriptions_tracked")
    .update({ is_active: isActive })
    .eq("id", subscriptionId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}

export async function deleteTrackedSubscription(subscriptionId: string) {
  const { supabase, userId } = await requireActiveUser();

  const { error } = await supabase
    .from("subscriptions_tracked")
    .delete()
    .eq("id", subscriptionId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}

// ============================================================
// Lectura con reparación automática de fechas vencidas
// ============================================================

export type TrackedSubscriptionRow = {
  id: string;
  serviceName: string;
  amount: number;
  currency: string;
  billingCycle: string;
  billingDay: number | null;
  nextChargeDate: string; // YYYY-MM-DD, ya reparada
  isActive: boolean;
  monthlyEquivalent: number;
  possibleDuplicateOf: string[];
  dueThisMonth: boolean;
  daysUntilCharge: number;
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function monthlyEquivalentOf(amount: number, cycle: string): number {
  if (cycle === "anual") return amount / 12;
  if (cycle === "semanal") return amount * 4.33;
  return amount;
}

export async function getTrackedSubscriptions(): Promise<TrackedSubscriptionRow[]> {
  const { supabase, userId } = await requireActiveUser();
  const today = todayInLima();

  const { data, error } = await supabase
    .from("subscriptions_tracked")
    .select("id, service_name, amount, currency, billing_cycle, billing_day, next_charge_date, is_active")
    .eq("user_id", userId)
    .order("next_charge_date", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data) return [];

  // Repara en memoria y persiste solo las que realmente cambiaron
  const repaired: { id: string; date: Date }[] = [];

  const rows = data.map((s) => {
    const stored = parseDateOnly(s.next_charge_date);
    const fixed = rollForward(s.billing_cycle, s.billing_day, stored, today);
    if (fixed.getTime() !== stored.getTime()) {
      repaired.push({ id: s.id, date: fixed });
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilCharge = Math.round((fixed.getTime() - today.getTime()) / msPerDay);
    const dueThisMonth =
      fixed.getFullYear() === today.getFullYear() && fixed.getMonth() === today.getMonth();

    return {
      id: s.id,
      serviceName: s.service_name,
      amount: Number(s.amount),
      currency: s.currency,
      billingCycle: s.billing_cycle,
      billingDay: s.billing_day,
      nextChargeDate: formatDateOnly(fixed),
      isActive: s.is_active,
      monthlyEquivalent: Math.round(monthlyEquivalentOf(Number(s.amount), s.billing_cycle) * 100) / 100,
      possibleDuplicateOf: [] as string[],
      dueThisMonth,
      daysUntilCharge,
    };
  });

  if (repaired.length > 0) {
    await Promise.all(
      repaired.map((r) =>
        supabase
          .from("subscriptions_tracked")
          .update({ next_charge_date: formatDateOnly(r.date) })
          .eq("id", r.id)
          .eq("user_id", userId)
      )
    );
  }

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      if (a.currency !== b.currency) continue;

      const normA = normalizeName(a.serviceName);
      const normB = normalizeName(b.serviceName);
      const namesSimilar = normA === normB || normA.includes(normB) || normB.includes(normA);
      const amountsSimilar = Math.abs(a.amount - b.amount) <= Math.max(a.amount, b.amount) * 0.15;

      if (namesSimilar && amountsSimilar) {
        a.possibleDuplicateOf.push(b.serviceName);
        b.possibleDuplicateOf.push(a.serviceName);
      }
    }
  }

  return rows;
}

/** Para el widget del dashboard: suscripciones activas cuyo cobro cae dentro de los próximos `daysAhead` días. */
export async function getUpcomingSubscriptions(daysAhead = 7) {
  const all = await getTrackedSubscriptions();
  return all
    .filter((s) => s.isActive && s.daysUntilCharge >= 0 && s.daysUntilCharge <= daysAhead)
    .sort((a, b) => a.daysUntilCharge - b.daysUntilCharge);
}
