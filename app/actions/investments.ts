"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireActiveUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

const ASSET_TYPES = ["accion", "fondo", "cripto", "plazo_fijo", "inmueble"] as const;
const CURRENCIES = ["PEN", "USD", "USDT"] as const;
type AssetType = (typeof ASSET_TYPES)[number];
type Currency = (typeof CURRENCIES)[number];

function text(formData: FormData, ...keys: string[]): string {
  for (const key of keys) {
    const value = String(formData.get(key) ?? "").trim();
    if (value) return value;
  }
  return "";
}

function numberValue(formData: FormData, keys: string[], fallback = 0): number {
  const raw = text(formData, ...keys);
  if (!raw) return fallback;
  return Number(raw.replace(",", "."));
}

function optionalNumber(formData: FormData, keys: string[]): number | null {
  const raw = text(formData, ...keys);
  if (!raw) return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function validateCommon(formData: FormData) {
  const assetType = text(formData, "assettype", "asset_type") as AssetType;
  const name = text(formData, "name");
  const currency = (text(formData, "currency", "currency_code") || "PEN") as Currency;
  const quantity = numberValue(formData, ["quantity", "units"], 1);
  const purchasePrice = numberValue(formData, ["purchaseprice", "purchase_price"]);
  const currentPrice = numberValue(formData, ["currentprice", "current_price"]);

  if (!ASSET_TYPES.includes(assetType)) {
    throw new Error(`Tipo de activo inválido. Valor recibido: ${assetType || "vacío"}`);
  }
  if (!name) throw new Error("El nombre del activo es obligatorio.");
  if (!CURRENCIES.includes(currency)) throw new Error("Moneda inválida.");
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("La cantidad debe ser mayor a cero.");
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) throw new Error("El precio de compra no es válido.");
  if (!Number.isFinite(currentPrice) || currentPrice < 0) throw new Error("El precio actual no es válido.");

  return { assetType, name, currency, quantity, purchasePrice, currentPrice };
}

function buildInvestmentPayload(formData: FormData) {
  const common = validateCommon(formData);

  const ticker = text(formData, "ticker", "ticker_symbol").toUpperCase() || null;
  const exchange = text(formData, "exchange", "market") || null;
  const provider = text(formData, "provider") || null;
  const providerAssetId =
    text(formData, "providerassetid", "provider_asset_id", "binanceTicker") || ticker;
  const quoteCurrency = (text(formData, "quotecurrency", "quote_currency") || common.currency) as Currency;
  const autoPriceEnabled = text(formData, "autopriceenabled", "auto_price_enabled") === "true";
  const purchasedAt = text(formData, "purchasedat", "purchased_at") || null;
  const institution = text(formData, "institution") || null;
  const annualRate = optionalNumber(formData, ["annualrate", "annual_rate"]);
  const maturityDate = text(formData, "maturitydate", "maturity_date") || null;
  const ownershipPct = optionalNumber(formData, ["ownershippct", "ownership_pct"]);
  const debtRemaining = optionalNumber(formData, ["debtremaining", "debt_remaining"]);
  const notes = text(formData, "notes") || null;

  if (common.assetType === "plazo_fijo") {
    if (!institution) throw new Error("Indica la institución del plazo fijo.");
    if (annualRate === null || annualRate < 0) throw new Error("Indica una tasa anual válida.");
    if (!maturityDate) throw new Error("Indica la fecha de vencimiento.");
  }

  if (common.assetType === "inmueble") {
    if (ownershipPct !== null && (ownershipPct < 0 || ownershipPct > 100)) {
      throw new Error("La participación debe estar entre 0 y 100.");
    }
    if (debtRemaining !== null && debtRemaining < 0) {
      throw new Error("La deuda pendiente no es válida.");
    }
  }

  return {
    asset_type: common.assetType,
    name: common.name,
    quantity: common.quantity,
    purchase_price: common.purchasePrice,
    current_price: common.currentPrice,
    currency: common.currency,
    purchased_at: purchasedAt,
    ticker,
    exchange,
    provider,
    provider_asset_id: providerAssetId,
    quote_currency: quoteCurrency,
    auto_price_enabled: autoPriceEnabled,
    institution,
    annual_rate: annualRate,
    maturity_date: maturityDate,
    ownership_pct: ownershipPct,
    debt_remaining: debtRemaining,
    notes,
  };
}

export async function createInvestment(formData: FormData) {
  const { supabase, userId } = await requireActiveUser();
  const payload = buildInvestmentPayload(formData);

  const { data: investment, error } = await supabase
    .from("investments")
    .insert({ user_id: userId, ...payload })
    .select("id, current_price, currency, provider")
    .single();

  if (error) throw new Error(error.message);

  if (payload.provider === "binance") {
    await supabase.from("investment_price_history").insert({
      investment_id: investment.id,
      user_id: userId,
      price: Number(investment.current_price),
      currency: investment.currency,
      source: "binance",
    });
  }

  revalidatePath("/investments");
  revalidatePath("/dashboard");
}

export async function updateInvestment(investmentId: string, formData: FormData) {
  const { supabase, userId } = await requireActiveUser();
  const payload = buildInvestmentPayload(formData);

  const { error } = await supabase
    .from("investments")
    .update(payload)
    .eq("id", investmentId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  if (payload.provider === "binance") {
    await supabase.from("investment_price_history").insert({
      investment_id: investmentId,
      user_id: userId,
      price: payload.current_price,
      currency: payload.currency,
      source: "binance",
    });
  }

  revalidatePath("/investments");
  revalidatePath("/dashboard");
}

export async function updateInvestmentPrice(investmentId: string, currentPrice: number) {
  const { supabase, userId } = await requireActiveUser();

  if (!Number.isFinite(currentPrice) || currentPrice < 0) {
    throw new Error("El precio actual no es válido.");
  }

  const { data: investment, error: readError } = await supabase
    .from("investments")
    .select("currency, provider")
    .eq("id", investmentId)
    .eq("user_id", userId)
    .single();

  if (readError || !investment) throw new Error("Inversión no encontrada.");

  const { error } = await supabase
    .from("investments")
    .update({
      current_price: currentPrice,
      last_price_sync_at: new Date().toISOString(),
    })
    .eq("id", investmentId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  await supabase.from("investment_price_history").insert({
    investment_id: investmentId,
    user_id: userId,
    price: currentPrice,
    currency: investment.currency,
    source: investment.provider ?? "manual",
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
}

export async function deleteInvestment(investmentId: string) {
  const { supabase, userId } = await requireActiveUser();

  const { error } = await supabase
    .from("investments")
    .delete()
    .eq("id", investmentId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/investments");
  revalidatePath("/dashboard");
}

export type InvestmentRowData = {
  id: string;
  assetType: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currency: string;
  purchasedAt: string | null;
  ticker: string | null;
  provider: string | null;
  exchange: string | null;
  quoteCurrency: string | null;
  institution: string | null;
  annualRate: number | null;
  maturityDate: string | null;
  ownershipPct: number | null;
  debtRemaining: number | null;
  notes: string | null;
  lastPriceSyncAt: string | null;
  costBasis: number;
  marketValue: number;
  gain: number;
  gainPct: number;
  annualizedReturnPct: number | null;
};

export async function getInvestments(): Promise<InvestmentRowData[]> {
  const { supabase, userId } = await requireActiveUser();

  const { data, error } = await supabase
    .from("investments")
    .select(
      "id, asset_type, name, quantity, purchase_price, current_price, currency, purchased_at, ticker, provider, exchange, quote_currency, institution, annual_rate, maturity_date, ownership_pct, debt_remaining, notes, last_price_sync_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];

  const now = new Date();

  return data.map((investment) => {
    const quantity = Number(investment.quantity);
    const purchasePrice = Number(investment.purchase_price);
    const currentPrice = Number(investment.current_price ?? 0);
    const costBasis = quantity * purchasePrice;
    const marketValue = quantity * currentPrice;
    const gain = marketValue - costBasis;
    const gainPct = costBasis > 0 ? (gain / costBasis) * 100 : 0;

    let annualizedReturnPct: number | null = null;

    if (investment.purchased_at && costBasis > 0) {
      const yearsHeld =
        (now.getTime() - new Date(`${investment.purchased_at}T12:00:00`).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25);

      if (yearsHeld > 0.02) {
        annualizedReturnPct =
          (Math.pow(Math.max(marketValue / costBasis, 0), 1 / yearsHeld) - 1) * 100;
      }
    }

    return {
      id: investment.id,
      assetType: investment.asset_type,
      name: investment.name,
      quantity,
      purchasePrice,
      currentPrice,
      currency: investment.currency,
      purchasedAt: investment.purchased_at,
      ticker: investment.ticker,
      provider: investment.provider,
      exchange: investment.exchange,
      quoteCurrency: investment.quote_currency,
      institution: investment.institution,
      annualRate: investment.annual_rate === null ? null : Number(investment.annual_rate),
      maturityDate: investment.maturity_date,
      ownershipPct: investment.ownership_pct === null ? null : Number(investment.ownership_pct),
      debtRemaining: investment.debt_remaining === null ? null : Number(investment.debt_remaining),
      notes: investment.notes,
      lastPriceSyncAt: investment.last_price_sync_at,
      costBasis: Math.round(costBasis * 100) / 100,
      marketValue: Math.round(marketValue * 100) / 100,
      gain: Math.round(gain * 100) / 100,
      gainPct: Math.round(gainPct * 100) / 100,
      annualizedReturnPct:
        annualizedReturnPct === null ? null : Math.round(annualizedReturnPct * 100) / 100,
    };
  });
}

export type AllocationSlice = {
  assetType: string;
  value: number;
};

export async function getInvestmentAllocation(): Promise<AllocationSlice[]> {
  const investments = await getInvestments();
  const byType = new Map<string, number>();

  for (const investment of investments) {
    if (investment.currency !== "PEN") continue;

    byType.set(
      investment.assetType,
      (byType.get(investment.assetType) ?? 0) + investment.marketValue,
    );
  }

  return Array.from(byType.entries()).map(([assetType, value]) => ({
    assetType,
    value: Math.round(value * 100) / 100,
  }));
}
