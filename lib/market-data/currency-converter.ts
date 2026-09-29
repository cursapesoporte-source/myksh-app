import { getBinancePrice } from "./binance-client";
import { getFiatRate } from "./fiat-rates-client";
import type { ConversionResult, MarketCurrency } from "./types";

function asMarketCurrency(value: string): MarketCurrency {
  const normalized = value.toUpperCase();
  if (normalized === "USD" || normalized === "USDT") return normalized;
  return "PEN";
}

export async function convertToBaseCurrency(
  amount: number,
  fromCurrency: string,
  baseCurrency: MarketCurrency,
): Promise<ConversionResult> {
  const from = asMarketCurrency(fromCurrency);
  if (!Number.isFinite(amount)) throw new Error("Importe inválido para conversión.");
  if (from === baseCurrency) return { amount, currency: baseCurrency, source: "identity", route: [from], updatedAt: new Date().toISOString(), isStale: false };

  if (from === "USDT") {
    if (baseCurrency === "USD") return { amount, currency: "USD", source: "usdt_usd_approximation", route: ["USDT", "USD"], updatedAt: new Date().toISOString(), isStale: false };
    const usdToBase = await getFiatRate("USD", baseCurrency);
    return { amount: amount * usdToBase.rate, currency: baseCurrency, source: `usdt_usd_approximation+${usdToBase.source}`, route: ["USDT", "USD", baseCurrency], updatedAt: usdToBase.updatedAt, isStale: usdToBase.source === "fallback_reference" };
  }

  const quote = await getFiatRate(from, baseCurrency);
  return { amount: amount * quote.rate, currency: baseCurrency, source: quote.source, route: [from, baseCurrency], updatedAt: quote.updatedAt, isStale: quote.source === "fallback_reference" };
}

export async function valueCryptoInBaseCurrency(quantity: number, ticker: string, baseCurrency: MarketCurrency, forceRefresh = false): Promise<ConversionResult> {
  const quote = await getBinancePrice(ticker, { forceRefresh });
  const converted = await convertToBaseCurrency(quantity * quote.rate, "USDT", baseCurrency);
  return { ...converted, route: [ticker, ...converted.route], source: `${quote.source}+${converted.source}`, updatedAt: converted.updatedAt };
}
