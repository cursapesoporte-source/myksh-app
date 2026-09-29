import { getMonthlyFlow, getNetWorthPEN, getTopExpenseCategories } from "@/app/actions/dashboard-analytics";
import CashFlowChart from "@/components/dashboard/CashFlowChart";

export default async function FinancialOverview() {
  const [netWorth, flow, topCategories] = await Promise.all([
    getNetWorthPEN(),
    getMonthlyFlow(),
    getTopExpenseCategories(),
  ]);

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-[#E5E7EB]">Resumen financiero</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-white/50">Patrimonio neto (solo PEN)</p>
          <p className="mt-1 text-2xl font-semibold text-[#4ADE80]">S/{netWorth.netWorth.toFixed(2)}</p>
          <p className="mt-1 text-xs text-white/30">
            Cuentas: S/{netWorth.accountsTotal.toFixed(2)} · Inversiones: S/{netWorth.investmentsTotal.toFixed(2)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:col-span-2">
          <p className="mb-2 text-sm text-white/50">Top 3 categorías de gasto este mes</p>
          {topCategories.length > 0 ? (
            <div className="grid gap-2">
              {topCategories.map((cat) => (
                <div key={cat.categoryName} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">{cat.categoryName}</span>
                  <span className="font-mono font-semibold text-[#F87171]">S/{cat.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/40">
              Sin gastos categorizados este mes. Revisa /transactions para asignar categorías.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <CashFlowChart data={flow} />
      </div>
    </section>
  );
}
