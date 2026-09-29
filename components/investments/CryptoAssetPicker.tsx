"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CRYPTO_CATALOG,
  searchCryptoCatalog,
  type CryptoCatalogEntry,
} from "@/lib/market-data/crypto-catalog";

type CryptoAssetPickerProps = {
  value: CryptoCatalogEntry;
  onChange: (asset: CryptoCatalogEntry) => void;
};

export default function CryptoAssetPicker({
  value,
  onChange,
}: CryptoAssetPickerProps) {
  const [query, setQuery] = useState(`${value.name} (${value.symbol})`);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const trimmedQuery = query.trim();
    return trimmedQuery
      ? searchCryptoCatalog(trimmedQuery).slice(0, 10)
      : CRYPTO_CATALOG.slice(0, 10);
  }, [query]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function selectAsset(asset: CryptoCatalogEntry) {
    onChange(asset);
    setQuery(`${asset.name} (${asset.symbol})`);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor="crypto-asset-search"
        className="mb-2 block text-sm"
      >
        Criptomoneda
      </label>

      <input
        id="crypto-asset-search"
        type="text"
        value={query}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        placeholder="Busca Bitcoin, BTC, Ethereum..."
        className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-E5E7EB outline-none focus:border-4ADE80"
      />

      {open && (
        <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#111820] p-1 shadow-2xl">
          {results.length > 0 ? (
            results.map((asset) => (
              <button
                key={asset.symbol}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectAsset(asset)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-E5E7EB hover:bg-white/10"
              >
                <span>
                  {asset.name} — {asset.symbol}
                </span>
                <span className="ml-3 text-xs text-white/45">
                  {asset.binanceTicker}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-white/50">
              No encontramos ese activo en el catálogo.
            </p>
          )}
        </div>
      )}

      <p className="mt-2 text-xs text-white/45">
        Par consultado automáticamente en Binance: {value.binanceTicker}
      </p>

      <input type="hidden" name="cryptoSymbol" value={value.symbol} />
      <input
        type="hidden"
        name="binanceTicker"
        value={value.binanceTicker}
      />
    </div>
  );
}
