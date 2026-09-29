"use client";

import { Bar, BarChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyReturnPoint } from "@/app/actions/investment-performance";
function money(value: number, currency: string) { return new Intl.NumberFormat("es-PE", { style: "currency", currency: currency === "USDT" ? "USD" : currency, maximumFractionDigits: 2 }).format(value); }

export default function MonthlyReturnChart({ data, baseCurrency, benchmarkAnnualPct = 5 }: { data: MonthlyReturnPoint[]; baseCurrency: string; benchmarkAnnualPct?: number }) {
  if (!data.length) return <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 text-center text-sm text-white/40">Todavía no hay suficientes datos históricos para calcular la rentabilidad mensual.</div>;
  const chartData = data.map((item) => ({ ...item, reference: item.referenceChange }));
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-medium text-white/80">Rentabilidad mensual</p><p className="mt-1 text-xs text-white/45">Variación real frente a una referencia anualizada del {benchmarkAnnualPct.toFixed(1)}%, respetando los filtros.</p><ResponsiveContainer width="100%" height={260}><BarChart data={chartData} margin={{ top: 12, right: 8, left: 8, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" /><XAxis dataKey="label" tick={{ fill: "#9CA3AF", fontSize: 11 }} /><YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} /><Tooltip formatter={(value, name) => [money(Number(value ?? 0), baseCurrency), name === "reference" ? "Referencia" : "Rentabilidad"]} contentStyle={{ backgroundColor: "#0B0F14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} /><Bar dataKey="change" name="Rentabilidad" fill="#4ADE80" radius={[5, 5, 0, 0]} /><Line type="monotone" dataKey="reference" name="Referencia" stroke="#FBBF24" strokeWidth={2} dot={false} /></BarChart></ResponsiveContainer></div>;
}
