"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AllocationSlice } from "@/app/actions/investments";

const ASSET_TYPE_LABEL: Record<string, string> = { accion: "Acciones", fondo: "Fondos", cripto: "Cripto", plazo_fijo: "Plazo fijo", inmueble: "Inmuebles" };
const COLORS = ["#4ADE80", "#60A5FA", "#FBBF24", "#F87171", "#A78BFA"];

export default function AllocationPieChart({ data }: { data: AllocationSlice[] }) {
  if (!data.length) return <div className="flex h-64 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm text-white/40">Agrega inversiones en soles para ver la distribución de tu cartera.</div>;
  const chartData = data.map((item) => ({ name: ASSET_TYPE_LABEL[item.assetType] ?? item.assetType, value: item.value }));
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="mb-2 text-sm font-medium text-white/70">Distribución de la cartera (PEN)</p><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>{chartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="#0B0F14" />)}</Pie><Tooltip formatter={(value) => [`S/${Number(value ?? 0).toFixed(2)}`, "Valor"]} contentStyle={{ backgroundColor: "#0B0F14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#E5E7EB" }} /><Legend wrapperStyle={{ fontSize: 12, color: "#E5E7EB" }} /></PieChart></ResponsiveContainer></div>;
}
