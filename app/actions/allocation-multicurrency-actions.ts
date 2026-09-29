"use server";

import { createClient } from "@/lib/supabase/server";
import {
  convertToBaseCurrency,
  valueCryptoInBaseCurrency,
} from "@/lib/market-data/currency-converter";
import type { MarketCurrency } from "@/lib/market-data/types";

export type InvestmentFilterType =
  | "all"
  | "accion"
  | "fondo"
  | "cripto"
  | "plazo_fijo"
  | "inmueble";

export type InvestmentFilterCurrency = "all" | MarketCurrency;

export type MultiCurrencyAllocationSlice = {
  key: string;
  label: string;
  assetType: string;
  ticker: string | null;
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number | null;
  baseCurrency: MarketCurrency;
  source: string | null;
  route: string[] | null;
  updatedAt: string | null;
  isStale: boolean;
  status: "converted" | "pending";
};

export type AllocationByTypeSlice = {
  assetType: string;
  label: string;
  value: number;
  baseCurrency: MarketCurrency;
};

export type MultiCurrencyAllocationResult = {
  baseCurrency: MarketCurrency;
  slices: MultiCurrencyAllocationSlice[];
  byType: AllocationByTypeSlice[];
  convertedTotal: number;
  pendingCount: number;
  updatedAt: string;
};

function normalizeBaseCurrency(value: string): MarketCurrency {
  const normalized = value.toUpperCase();
  if (normalized === "USD" || normalized === "USDT") return normalized;
  return "PEN";
}

function matchesType(assetType: string, filter: InvestmentFilterType) {
  return filter === "all" || assetType === filter;
}

function matchesCurrency(currency: string, filter: InvestmentFilterCurrency) {
  return filter === "all" || currency === filter;
}

const TYPE_LABELS: Record<string, string> = {
  accion: "Acciones",
  fondo: "Fondos",
  cripto: "Cripto",
  plazo_fijo: "Plazo fijo",
  inmueble: "Inmuebles",
};

export async function getMultiCurrencyInvestmentAllocation(
  requestedBaseCurrency = "PEN",
  typeFilter: InvestmentFilterType = "all",
  currencyFilter: InvestmentFilterCurrency = "all",
): Promise<MultiCurrencyAllocationResult> {
  const baseCurrency = normalizeBaseCurrency(requestedBaseCurrency);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    throw new Error("Debes iniciar sesión para consultar tu cartera.");
  }

  const { data: investments, error } = await supabase
    .from("investments")
    .select(
      "id, asset_type, name, quantity, current_price, currency, ticker, provider",
    )
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const slices: MultiCurrencyAllocationSlice[] = [];
  const byTypeMap = new Map<string, number>();
  let convertedTotal = 0;
  let pendingCount = 0;

  for (const investment of investments ?? []) {
    const assetType = String(investment.asset_type);
    const sourceCurrency = String(investment.currency).toUpperCase();

    if (!matchesType(assetType, typeFilter)) continue;
    if (!matchesCurrency(sourceCurrency, currencyFilter)) continue;

    const quantity = Number(investment.quantity ?? 0);
    const unitPrice = Number(investment.current_price ?? 0);
    const originalAmount = quantity * unitPrice;
    const ticker = investment.ticker ?? null;
    const label = ticker ? `${investment.name} (${ticker})` : investment.name;

    try {
      const conversion =
        assetType === "cripto" && ticker && sourceCurrency === "USDT"
          ? await valueCryptoInBaseCurrency(quantity, ticker, baseCurrency, false)
          : await convertToBaseCurrency(
              originalAmount,
              sourceCurrency,
              baseCurrency,
            );

      if (!conversion || !Number.isFinite(conversion.amount)) {
        throw new Error("No se obtuvo una conversión válida.");
      }

      convertedTotal += conversion.amount;
      byTypeMap.set(
        assetType,
        (byTypeMap.get(assetType) ?? 0) + conversion.amount,
      );

      slices.push({
        key: investment.id,
        label,
        assetType,
        ticker,
        originalAmount,
        originalCurrency: sourceCurrency,
        convertedAmount: conversion.amount,
        baseCurrency,
        source: conversion.source,
        route: conversion.route,
        updatedAt: conversion.updatedAt,
        isStale: conversion.isStale,
        status: "converted",
      });
    } catch {
      pendingCount += 1;
      slices.push({
        key: investment.id,
        label,
        assetType,
        ticker,
        originalAmount,
        originalCurrency: sourceCurrency,
        convertedAmount: null,
        baseCurrency,
        source: null,
        route: null,
        updatedAt: null,
        isStale: false,
        status: "pending",
      });
    }
  }

  return {
    baseCurrency,
    slices,
    byType: Array.from(byTypeMap.entries()).map(([assetType, value]) => ({
      assetType,
      label: TYPE_LABELS[assetType] ?? assetType,
      value,
      baseCurrency,
    })),
    convertedTotal,
    pendingCount,
    updatedAt: new Date().toISOString(),
  };
}
