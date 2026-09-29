"use client";

import { useState, useTransition } from "react";
import {
  deleteInvestment,
  updateInvestment,
  updateInvestmentPrice,
  type InvestmentRowData,
} from "@/app/actions/investments";

const CURRENCY_SYMBOL: Record<string, string> = { PEN: "S/", USD: "USD", USDT: "USDT" };
const ASSET_TYPE_LABEL: Record<string, string> = {
  accion: "Acción",
  fondo: "Fondo",
  cripto: "Cripto",
  plazo_fijo: "Plazo fijo",
  inmueble: "Inmueble",
};

export default function InvestmentRow({
  investment,
  benchmarkAnnualPct,
}: {
  investment: InvestmentRowData;
  benchmarkAnnualPct: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [priceInput, setPriceInput] = useState(String(investment.currentPrice));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const symbol = CURRENCY_SYMBOL[investment.currency] ?? investment.currency;
  const isPositive = investment.gain >= 0;

  function handleQuickPriceUpdate() {
    const parsed = Number(priceInput.replace(",", "."));
    if (Number.isNaN(parsed) || parsed < 0) {
      setError("Precio inválido.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await updateInvestmentPrice(investment.id, parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar.");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar "${investment.name}" de tu cartera?`)) return;
    startTransition(async () => {
      await deleteInvestment(investment.id);
    });
  }

  async function handleSaveEdit(formData: FormData) {
    setError("");
    startTransition(async () => {
      try {
        await updateInvestment(investment.id, formData);
        setIsEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar el cambio.");
      }
    });
  }

  const vsBenchmark =
    investment.annualizedReturnPct !== null ? investment.annualizedReturnPct - benchmarkAnnualPct : null;

  if (isEditing) {
    return (
      <form
        action={handleSaveEdit}
        className="grid gap-3 rounded-2xl border border-[#60A5FA]/30 bg-[#60A5FA]/5 p-4 sm:grid-cols-3"
      >
        <div className="sm:col-span-3">
          <label className="mb-1 block text-xs text-white/50">Nombre</label>
          <input
            name="name"
            defaultValue={investment.name}
            required
            className="min-h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#4ADE80]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/50">Tipo</label>
          <select
            name="asset_type"
            defaultValue={investment.assetType}
            className="min-h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
          >
            {Object.entries(ASSET_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value} className="bg-[#0B0F14]">{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/50">Moneda</label>
          <select
            name="currency"
            defaultValue={investment.currency}
            className="min-h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#E5E7EB] outline-none focus:border-[#4ADE80]"
          >
            <option value="PEN" className="bg-[#0B0F14]">PEN</option>
            <option value="USD" className="bg-[#0B0F14]">USD</option>
            <option value="USDT" className="bg-[#0B0F14]">USDT</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/50">Cantidad</label>
          <input
            name="quantity"
            type="number"
            step="0.00000001"
            defaultValue={investment.quantity}
            required
            className="min-h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#4ADE80]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/50">Precio de compra</label>
          <input
            name="purchase_price"
            type="number"
            step="0.01"
            defaultValue={investment.purchasePrice}
            required
            className="min-h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#4ADE80]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/50">Precio actual</label>
          <input
            name="current_price"
            type="number"
            step="0.01"
            defaultValue={investment.currentPrice}
            required
            className="min-h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#4ADE80]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-white/50">Fecha de compra</label>
          <input
            name="purchased_at"
            type="date"
            defaultValue={investment.purchasedAt ?? ""}
            className="min-h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#4ADE80]"
          />
        </div>

        {error && <p className="sm:col-span-3 text-xs text-[#F87171]">{error}</p>}

        <div className="sm:col-span-3 flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="min-h-9 rounded-lg bg-[#4ADE80] px-4 py-2 text-sm font-semibold text-[#0B0F14] disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="min-h-9 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#E5E7EB]">{investment.name}</p>
          <p className="text-xs text-white/50">
            {ASSET_TYPE_LABEL[investment.assetType]}
            {investment.ticker ? ` · ${investment.ticker}` : ""}
            {investment.provider ? ` · ${investment.provider}` : ""}
            {" · "}
            {investment.quantity} unidad(es) a{" "}
            {symbol}
            {investment.currentPrice.toFixed(2)}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-[#60A5FA] hover:text-[#60A5FA]"
          >
            Editar
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-[#F87171] hover:text-[#F87171]"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs text-white/40">Valor de mercado</p>
          <p className="font-mono font-semibold">{symbol}{investment.marketValue.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-white/40">Costo</p>
          <p className="font-mono text-white/60">{symbol}{investment.costBasis.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-white/40">Rentabilidad</p>
          <p className={`font-mono font-semibold ${isPositive ? "text-[#4ADE80]" : "text-[#F87171]"}`}>
            {isPositive ? "+" : ""}{symbol}{investment.gain.toFixed(2)} ({isPositive ? "+" : ""}{investment.gainPct.toFixed(1)}%)
          </p>
        </div>
        <div>
          <p className="text-xs text-white/40">Anualizada vs. referencia</p>
          {investment.annualizedReturnPct !== null ? (
            <p className={`font-mono font-semibold ${vsBenchmark !== null && vsBenchmark >= 0 ? "text-[#4ADE80]" : "text-[#F87171]"}`}>
              {investment.annualizedReturnPct.toFixed(1)}%{" "}
              <span className="text-xs text-white/40">
                ({vsBenchmark !== null && vsBenchmark >= 0 ? "+" : ""}{vsBenchmark?.toFixed(1)} pts)
              </span>
            </p>
          ) : (
            <p className="text-xs text-white/40">Sin fecha de compra</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
        <label className="text-xs text-white/40">Actualizar precio actual:</label>
        <input
          type="number"
          step="0.01"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          className="w-28 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-sm outline-none focus:border-[#4ADE80]"
        />
        <button
          onClick={handleQuickPriceUpdate}
          disabled={isPending}
          className="rounded-lg bg-[#60A5FA]/20 px-3 py-1 text-xs font-semibold text-[#60A5FA] hover:bg-[#60A5FA]/30 disabled:opacity-50"
        >
          Actualizar
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[#F87171]">{error}</p>}
    </div>
  );
}
