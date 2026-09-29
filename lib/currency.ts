// lib/currency.ts
// Utilidad pura de conversión de monedas. NO lleva "use server" porque
// se usa tanto en Server Components/Actions como en Client Components
// (InvestmentsClientPage). Si estuviera en exchange-rates.ts (que sí
// tiene "use server"), Next.js la trataría como Server Action y
// exigiría que fuera async, aunque no necesita serlo.

export type Currency = "PEN" | "USD" | "USDT";
export const SUPPORTED_CURRENCIES: Currency[] = ["PEN", "USD", "USDT"];

export type ExchangeRateRow = {
  baseCurrency: Currency;
  quoteCurrency: Currency;
  rate: number;
};

/**
 * Convierte un importe a la moneda destino usando tasas directas o
 * inversas. rate A->B significa: 1 unidad de A = rate unidades de B.
 * Devuelve null si no hay ninguna tasa (directa, inversa, o vía PEN)
 * que permita hacer la conversión.
 */
export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  rates: ExchangeRateRow[]
): number | null {
  if (from === to) return amount;

  const direct = rates.find((r) => r.baseCurrency === from && r.quoteCurrency === to);
  if (direct) return amount * direct.rate;

  const inverse = rates.find((r) => r.baseCurrency === to && r.quoteCurrency === from);
  if (inverse && inverse.rate > 0) return amount / inverse.rate;

  if (from !== "PEN" && to !== "PEN") {
    const toPen = convertAmount(amount, from, "PEN", rates);
    if (toPen !== null) return convertAmount(toPen, "PEN", to, rates);
  }

  return null;
}
