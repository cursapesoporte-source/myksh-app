"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPPORTED_CURRENCIES, type Currency, type ExchangeRateRow } from "@/lib/currency";

export type { Currency, ExchangeRateRow };

async function requireActiveUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function getExchangeRates(): Promise<ExchangeRateRow[]> {
  const { supabase, userId } = await requireActiveUser();
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("base_currency, quote_currency, rate")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    baseCurrency: row.base_currency as Currency,
    quoteCurrency: row.quote_currency as Currency,
    rate: Number(row.rate),
  }));
}

export async function upsertExchangeRate(
  baseCurrency: Currency,
  quoteCurrency: Currency,
  rate: number
) {
  const { supabase, userId } = await requireActiveUser();

  if (baseCurrency === quoteCurrency) throw new Error("Las monedas deben ser diferentes.");
  if (!SUPPORTED_CURRENCIES.includes(baseCurrency) || !SUPPORTED_CURRENCIES.includes(quoteCurrency)) {
    throw new Error("Moneda no soportada.");
  }
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("La tasa debe ser mayor a cero.");

  const { error } = await supabase.from("exchange_rates").upsert(
    {
      user_id: userId,
      base_currency: baseCurrency,
      quote_currency: quoteCurrency,
      rate,
    },
    { onConflict: "user_id,base_currency,quote_currency" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/investments");
  revalidatePath("/dashboard");
}

export async function deleteExchangeRate(baseCurrency: Currency, quoteCurrency: Currency) {
  const { supabase, userId } = await requireActiveUser();
  const { error } = await supabase
    .from("exchange_rates")
    .delete()
    .eq("user_id", userId)
    .eq("base_currency", baseCurrency)
    .eq("quote_currency", quoteCurrency);

  if (error) throw new Error(error.message);
  revalidatePath("/investments");
  revalidatePath("/dashboard");
}
