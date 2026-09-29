import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SYMBOL_RE = /^[A-Z0-9]{5,20}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = (url.searchParams.get("symbol") ?? "").toUpperCase().trim();

  if (!SYMBOL_RE.test(symbol) || !symbol.endsWith("USDT")) {
    return NextResponse.json({ error: "Símbolo Binance inválido. Usa, por ejemplo, BTCUSDT." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://data-api.binance.vision/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Binance no encontró ese par." }, { status: 404 });
    }

    const data = (await response.json()) as { symbol?: string; price?: string };
    const price = Number(data.price);
    if (!data.symbol || !Number.isFinite(price)) {
      return NextResponse.json({ error: "Respuesta de precio inválida." }, { status: 502 });
    }

    return NextResponse.json({ symbol: data.symbol, price, currency: "USDT", source: "binance" });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar Binance en este momento." }, { status: 502 });
  }
}
