import type { MarketQuote } from "./types";

type CacheEntry = {
  quote: MarketQuote;
  expiresAt: number;
};

const quoteCache = new Map<string, CacheEntry>();
const CACHE_MS = 15 * 60 * 1000;

export function getCachedQuote(key: string): MarketQuote | null {
  const entry = quoteCache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    quoteCache.delete(key);
    return null;
  }

  return entry.quote;
}

export function setCachedQuote(key: string, quote: MarketQuote): void {
  quoteCache.set(key, {
    quote,
    expiresAt: Date.now() + CACHE_MS,
  });
}

export function invalidateCachedQuote(key: string): void {
  quoteCache.delete(key);
}

export function invalidateBinanceQuote(symbol: string): void {
  invalidateCachedQuote(`binance-${symbol.toUpperCase().trim()}`);
}
