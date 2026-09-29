"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyFlowPoint } from "@/app/actions/dashboard-analytics";

export default function CashFlowChart({ data }: { data: MonthlyFlowPoint[] }) {
  const hasAnyData = data.some((item) => item.ingresos !== 0 || item.gastos !== 0);
  if (!hasAnyData) return <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/40">Aún no hay suficientes transacciones en soles para graficar el flujo.</div>;
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="mb-2 text-sm font-medium text-white/70">Ingresos vs. gastos — últimos 6 meses, PEN</p><ResponsiveContainer width="100%" height={260}><LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" /><XAxis dataKey="monthLabel" stroke="rgba(255,255,255,0.4)" fontSize={12} /><YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} /><Tooltip formatter={(value) => [`S/${Number(value ?? 0).toFixed(2)}`, "Monto"]} contentStyle={{ backgroundColor: "#0B0F14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#E5E7EB" }} /><Legend wrapperStyle={{ fontSize: 12, color: "#E5E7EB" }} /><Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#4ADE80" strokeWidth={2} dot={{ r: 3 }} /><Line type="monotone" dataKey="gastos" name="Gastos" stroke="#F87171" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>;
}
