"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getBinancePrice } from "@/lib/market-data/binance-client";

export type SyncedInvestmentPrice = {
  investmentId: string;
  ticker: string;
  price: number;
  currency: string;
  updatedAt: string;
};

export async function syncInvestmentMarketPrices(): Promise<SyncedInvestmentPrice[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión no válida.");

  const { data: investments, error: readError } = await supabase
    .from("investments")
    .select("id, ticker, asset_type, currency")
    .eq("user_id", user.id)
    .eq("asset_type", "cripto")
    .not("ticker", "is", null);

  if (readError) throw new Error(readError.message);

  const synced: SyncedInvestmentPrice[] = [];

  for (const investment of investments ?? []) {
    if (!investment.ticker) continue;

    const quote = await getBinancePrice(investment.ticker);
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("investments")
      .update({
        current_price: quote.rate,
        last_price_sync_at: now,
        provider: "binance",
        quote_currency: quote.to,
      })
      .eq("id", investment.id)
      .eq("user_id", user.id);

    if (updateError) throw new Error(updateError.message);

    const { error: historyError } = await supabase.from("investment_price_history").insert({
      investment_id: investment.id,
      user_id: user.id,
      price: quote.rate,
      currency: quote.to,
      source: quote.source,
    });

    if (historyError) throw new Error(historyError.message);

    synced.push({
      investmentId: investment.id,
      ticker: investment.ticker,
      price: quote.rate,
      currency: quote.to,
      updatedAt: now,
    });
  }

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return synced;
}
