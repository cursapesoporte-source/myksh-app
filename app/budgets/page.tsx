import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBudgetsWithProgress, getExpenseCategories } from "@/app/actions/budgets";
import NewBudgetForm from "@/components/budgets/NewBudgetForm";
import BudgetBar from "@/components/budgets/BudgetBar";

export default async function BudgetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("access_until, status")
    .eq("user_id", user.id)
    .order("updated_by_admin_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription || new Date(subscription.access_until) < new Date()) {
    redirect("/access-expired");
  }

  const [budgets, categories] = await Promise.all([
    getBudgetsWithProgress(),
    getExpenseCategories(),
  ]);

  const usedCategoryIds = new Set(budgets.map((b) => b.categoryId));
  const availableCategories = categories.filter((c) => !usedCategoryIds.has(c.id));

  const totalLimit = budgets.reduce((sum, b) => sum + (b.currency === "PEN" ? b.monthlyLimit : 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.currency === "PEN" ? b.spent : 0), 0);
  const now = new Date();
  const monthLabel = now.toLocaleDateString("es-PE", { month: "long", year: "numeric" });

  return (
    <main className="min-h-screen bg-[#0B0F14] px-4 py-6 text-[#E5E7EB] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#4ADE80]">MyKSH</p>
            <h1 className="mt-2 text-3xl font-semibold">Presupuestos</h1>
            <p className="mt-1 text-sm capitalize text-white/50">{monthLabel}</p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm hover:border-[#4ADE80] hover:text-[#4ADE80]"
          >
            Volver al dashboard
          </Link>
        </div>

        {budgets.length > 0 && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-white/50">Total presupuestado este mes (PEN)</p>
            <p className="mt-1 text-2xl font-semibold">
              S/{totalSpent.toFixed(2)} <span className="text-white/40">/ S/{totalLimit.toFixed(2)}</span>
            </p>
          </div>
        )}

        <div className="mt-6">
          {availableCategories.length > 0 ? (
            <NewBudgetForm categories={availableCategories} />
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/50">
              Ya tienes un presupuesto configurado para todas tus categorías de gasto disponibles.
            </p>
          )}
        </div>

        <section className="mt-6 grid gap-4">
          {budgets.length > 0 ? (
            budgets
              .sort((a, b) => b.percentage - a.percentage)
              .map((budget) => <BudgetBar key={budget.id} budget={budget} />)
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
              Todavía no tienes presupuestos. Crea el primero arriba para empezar a controlar tus gastos por categoría.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
