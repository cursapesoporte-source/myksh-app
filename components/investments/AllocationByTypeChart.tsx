"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AllocationByTypeSlice } from "@/app/actions/allocation-multicurrency-actions";

const COLORS = ["#4ADE80", "#60A5FA", "#FBBF24", "#F87171", "#A78BFA"];
function money(value: number, currency: string) { return new Intl.NumberFormat("es-PE", { style: "currency", currency: currency === "USDT" ? "USD" : currency, maximumFractionDigits: 2 }).format(value); }

export default function AllocationByTypeChart({ data, baseCurrency }: { data: AllocationByTypeSlice[]; baseCurrency: string }) {
  if (!data.length) return <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 text-center text-sm text-white/40">No hay datos convertibles para distribuir por tipo.</div>;
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-medium text-white/80">Distribución por tipo de activo</p><p className="mt-1 text-xs text-white/45">Valores agrupados en {baseCurrency}.</p><ResponsiveContainer width="100%" height={290}><PieChart><Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={58} outerRadius={98} paddingAngle={2}>{data.map((entry, index) => <Cell key={entry.assetType} fill={COLORS[index % COLORS.length]} stroke="#0B0F14" />)}</Pie><Tooltip formatter={(value) => [money(Number(value ?? 0), baseCurrency), "Valor"]} contentStyle={{ backgroundColor: "#0B0F14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#E5E7EB" }} /><Legend wrapperStyle={{ fontSize: 12, color: "#E5E7EB" }} /></PieChart></ResponsiveContainer></div>;
}
