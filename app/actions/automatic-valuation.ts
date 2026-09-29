"use server";

import { getInvestments } from "@/app/actions/investments";
import { convertToBaseCurrency, valueCryptoInBaseCurrency } from "@/lib/market-data/currency-converter";
import type { ConversionResult, MarketCurrency } from "@/lib/market-data/types";

export type AutomaticInvestmentValuation = {
  investmentId: string;
  originalValue: number;
  originalCurrency: string;
  baseValue: number | null;
  baseCurrency: MarketCurrency;
  conversion: ConversionResult | null;
  error: string | null;
};

export async function getAutomaticInvestmentValuation(
  baseCurrency: MarketCurrency = "PEN",
  forceRefresh = false
): Promise<AutomaticInvestmentValuation[]> {
  const investments = await getInvestments();
  const results: AutomaticInvestmentValuation[] = [];

  for (const investment of investments) {
    try {
      const conversion = investment.assetType === "cripto" && investment.ticker
        ? await valueCryptoInBaseCurrency(investment.quantity, investment.ticker, baseCurrency, forceRefresh)
        : await convertToBaseCurrency(investment.marketValue, investment.currency, baseCurrency);

      results.push({
        investmentId: investment.id,
        originalValue: investment.marketValue,
        originalCurrency: investment.currency,
        baseValue: conversion.amount,
        baseCurrency,
        conversion,
        error: null,
      });
    } catch (error) {
      results.push({
        investmentId: investment.id,
        originalValue: investment.marketValue,
        originalCurrency: investment.currency,
        baseValue: null,
        baseCurrency,
        conversion: null,
        error: error instanceof Error ? error.message : "No se pudo valorar automáticamente.",
      });
    }
  }

  return results;
}
