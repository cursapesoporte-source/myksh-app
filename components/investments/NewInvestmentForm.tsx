"use client";

import { useRef, useState } from "react";
import { createInvestment } from "@/app/actions/investments";
import CryptoAssetPicker from "./CryptoAssetPicker";
import {
  getCryptoBySymbol,
  type CryptoCatalogEntry,
} from "@/lib/market-data/crypto-catalog";

const TYPE_LABELS = {
  accion: "Acción",
  fondo: "Fondo",
  cripto: "Cripto",
  plazo_fijo: "Plazo fijo",
  inmueble: "Inmueble",
} as const;

type AssetType = keyof typeof TYPE_LABELS;

const DEFAULT_CRYPTO = getCryptoBySymbol("BTC") ?? {
  symbol: "BTC",
  name: "Bitcoin",
  binanceTicker: "BTCUSDT",
};

export default function NewInvestmentForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [assetType, setAssetType] = useState<AssetType>("cripto");
  const [cryptoAsset, setCryptoAsset] =
    useState<CryptoCatalogEntry>(DEFAULT_CRYPTO);
  const [price, setPrice] = useState("");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchBinancePrice() {
    setError("");
    setLoadingPrice(true);

    try {
      const response = await fetch(
        `/api/market/binance-price?symbol=${encodeURIComponent(
          cryptoAsset.binanceTicker,
        )}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        price?: string | number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo consultar Binance.");
      }

      if (data.price === undefined || data.price === null) {
        throw new Error("Binance no devolvió un precio válido.");
      }

      setPrice(String(data.price));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo consultar Binance.",
      );
    } finally {
      setLoadingPrice(false);
    }
  }

  async function handleAction(formData: FormData) {
    setError("");
    setLoading(true);
	
	formData.set("assettype", assetType);

    if (assetType === "cripto") {
      formData.set("ticker", cryptoAsset.binanceTicker);
      formData.set("cryptoSymbol", cryptoAsset.symbol);
      formData.set("binanceTicker", cryptoAsset.binanceTicker);
      formData.set("provider", "binance");
      formData.set("providerassetid", cryptoAsset.binanceTicker);
      formData.set("quotecurrency", "USDT");
      formData.set("autopriceenabled", "true");
    } else {
      formData.set("autopriceenabled", "false");
    }

    try {
      await createInvestment(formData);
      formRef.current?.reset();
      setAssetType("cripto");
      setCryptoAsset(DEFAULT_CRYPTO);
      setPrice("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo guardar la inversión.",
      );
    } finally {
      setLoading(false);
    }
  }

  const isStructured = assetType === "plazo_fijo" || assetType === "inmueble";
  const currencyLabel =
    assetType === "cripto"
      ? "Moneda de cotización"
      : assetType === "plazo_fijo"
        ? "Moneda del depósito"
        : assetType === "inmueble"
          ? "Moneda del inmueble"
          : "Moneda del activo";

  return (
    <form
      ref={formRef}
      action={handleAction}
      className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="assettype" className="mb-2 block text-sm">
          Tipo de activo
        </label>
        <select
          id="assettype"
          name="assettype"
          value={assetType}
          onChange={(event) => setAssetType(event.target.value as AssetType)}
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-E5E7EB outline-none focus:border-4ADE80"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value} className="bg-[#0B0F14]">
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="currency" className="mb-2 block text-sm">
          {currencyLabel}
        </label>
        <select
          id="currency"
          name="currency"
          defaultValue={assetType === "cripto" ? "USDT" : "PEN"}
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-E5E7EB outline-none focus:border-4ADE80"
        >
          <option value="PEN" className="bg-[#0B0F14]">
            Soles (PEN)
          </option>
          <option value="USD" className="bg-[#0B0F14]">
            Dólares (USD)
          </option>
          <option value="USDT" className="bg-[#0B0F14]">
            Tether (USDT)
          </option>
        </select>
      </div>

      {assetType === "cripto" && (
        <div className="sm:col-span-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <CryptoAssetPicker value={cryptoAsset} onChange={setCryptoAsset} />
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={fetchBinancePrice}
              disabled={loadingPrice}
              className="rounded-xl bg-amber-400 px-4 font-semibold text-[#0B0F14] disabled:opacity-50"
            >
              {loadingPrice ? "Consultando..." : "Precio"}
            </button>
            <p className="self-center text-xs text-white/45">
              El precio actual se consulta en Binance mediante {cryptoAsset.binanceTicker}.
            </p>
          </div>
        </div>
      )}

      <div className="sm:col-span-2">
        <label htmlFor="name" className="mb-2 block text-sm">
          Nombre del activo
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={assetType === "cripto" ? cryptoAsset.name : ""}
          placeholder={
            assetType === "accion"
              ? "Ej. Apple Inc."
              : assetType === "fondo"
                ? "Ej. Fondo mutuo BCP"
                : "Ej. Bitcoin"
          }
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-4ADE80"
        />
      </div>

      {(assetType === "accion" || assetType === "fondo") && (
        <>
          <div>
            <label htmlFor="tickermanual" className="mb-2 block text-sm">
              Ticker opcional
            </label>
            <input
              id="tickermanual"
              name="ticker"
              placeholder="Ej. AAPL, SPY, BAP"
              className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-4ADE80"
            />
          </div>
          {assetType === "accion" && (
            <div>
              <label htmlFor="exchange" className="mb-2 block text-sm">
                Bolsa o mercado
              </label>
              <input
                id="exchange"
                name="exchange"
                placeholder="NASDAQ, NYSE, BVL..."
                className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-4ADE80"
              />
            </div>
          )}
        </>
      )}

      {isStructured && (
        <div className="sm:col-span-2 rounded-xl border border-blue-400/30 bg-blue-400/5 p-4">
          <p className="mb-3 text-sm font-semibold text-blue-400">
            Datos específicos del activo
          </p>

          {assetType === "plazo_fijo" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-white/50">
                  Institución
                </label>
                <input
                  name="institution"
                  required
                  placeholder="BCP, Interbank..."
                  className="min-h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-4ADE80"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">
                  Tasa anual
                </label>
                <input
                  name="annualrate"
                  type="number"
                  step="0.01"
                  required
                  placeholder="5.25"
                  className="min-h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-4ADE80"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">
                  Vencimiento
                </label>
                <input
                  name="maturitydate"
                  type="date"
                  required
                  className="min-h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-4ADE80"
                />
              </div>
            </div>
          )}

          {assetType === "inmueble" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-white/50">
                  Descripción
                </label>
                <input
                  name="name"
                  required
                  placeholder="Departamento Lima"
                  className="min-h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-4ADE80"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">
                  Participación (%)
                </label>
                <input
                  name="ownershippct"
                  type="number"
                  step="0.01"
                  defaultValue="100"
                  className="min-h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-4ADE80"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">
                  Deuda pendiente
                </label>
                <input
                  name="debtremaining"
                  type="number"
                  step="0.01"
                  defaultValue="0"
                  className="min-h-10 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-4ADE80"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="quantity" className="mb-2 block text-sm">
          {assetType === "inmueble" || assetType === "plazo_fijo"
            ? "Unidades"
            : "Cantidad"}
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          step="0.00000001"
          defaultValue="1"
          required
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-4ADE80"
        />
      </div>

      <div>
        <label htmlFor="purchasedat" className="mb-2 block text-sm">
          Fecha de adquisición
        </label>
        <input
          id="purchasedat"
          name="purchasedat"
          type="date"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-4ADE80"
        />
      </div>

      <div>
        <label htmlFor="purchaseprice" className="mb-2 block text-sm">
          {assetType === "plazo_fijo" ? "Capital depositado" : "Precio de compra"}
        </label>
        <input
          id="purchaseprice"
          name="purchaseprice"
          type="number"
          step="0.01"
          required
          placeholder="0.00"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-4ADE80"
        />
      </div>

      <div>
        <label htmlFor="currentprice" className="mb-2 block text-sm">
          {assetType === "plazo_fijo" || assetType === "inmueble"
            ? "Valor actual estimado"
            : "Precio actual"}
        </label>
        <input
          id="currentprice"
          name="currentprice"
          type="number"
          step="0.01"
          value={assetType === "cripto" ? price : undefined}
          onChange={
            assetType === "cripto"
              ? (event) => setPrice(event.target.value)
              : undefined
          }
          required
          placeholder="0.00"
          className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-4ADE80"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="notes" className="mb-2 block text-sm">
          Notas opcionales
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Detalles adicionales..."
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-4ADE80"
        />
      </div>

      {error && (
        <p className="sm:col-span-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="sm:col-span-2 min-h-11 rounded-xl bg-green-400 px-4 py-3 font-semibold text-[#0B0F14] disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Agregar inversión"}
      </button>
    </form>
  );
}
