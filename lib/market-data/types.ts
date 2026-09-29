// lib/market-data/types.ts

export type MarketCurrency = "PEN" | "USD" | "USDT";

export type ConversionResult = {
  amount: number;
  currency: MarketCurrency;
  source: string;
  route: string[];
  updatedAt: string;
  isStale: boolean;
};

export type MarketQuote = {
  from: string;
  to: string;
  rate: number;
  source: string;
  updatedAt: string;
};
