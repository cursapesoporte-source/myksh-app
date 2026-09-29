// lib/market-data/binance-client.ts

import { getCachedQuote, setCachedQuote } from "./market-cache";
import type { MarketQuote } from "./types";

const BINANCE_BASE_URL = "https://data-api.binance.vision/api/v3";

export async function getBinancePrice(
  symbol: string,
  options?: { forceRefresh?: boolean }
): Promise<MarketQuote> {
  const normalized = symbol.toUpperCase().replace(/\s+/g, "");
  const cacheKey = `binance:${normalized}`;

  if (!options?.forceRefresh) {
    const cached = getCachedQuote(cacheKey);
    if (cached) return cached;
  }

  const response = await fetch(
    `${BINANCE_BASE_URL}/ticker/price?symbol=${encodeURIComponent(normalized)}`,
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    }
  );

  const data = (await response.json().catch(() => null)) as
    | { symbol?: string; price?: string; code?: number; msg?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      data?.msg || `Binance no encontró el par ${normalized}.`
    );
  }

  const price = Number(data?.price);

  if (!data?.symbol || !Number.isFinite(price)) {
    throw new Error("Binance devolvió un precio inválido.");
  }

  const quote: MarketQuote = {
    from: normalized,
    to: "USDT",
    rate: price,
    source: "binance",
    updatedAt: new Date().toISOString(),
  };

  setCachedQuote(cacheKey, quote);
  return quote;
}

export async function getUsdtUsdQuote(): Promise<MarketQuote> {
  return {
    from: "USDT",
    to: "USD",
    rate: 1,
    source: "usdt_usd_approximation",
    updatedAt: new Date().toISOString(),
  };
}
