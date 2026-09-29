import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGoalsWithProjection } from "@/app/actions/goals";
import NewGoalForm from "@/components/goals/NewGoalForm";
import GoalCard from "@/components/goals/GoalCard";

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("access_until")
    .eq("user_id", user.id)
    .order("updated_by_admin_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription || new Date(subscription.access_until) < new Date()) {
    redirect("/access-expired");
  }

  const goals = await getGoalsWithProjection();

  return (
    <main className="min-h-screen bg-[#0B0F14] px-4 py-6 text-[#E5E7EB] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#4ADE80]">MyKSH</p>
            <h1 className="mt-2 text-3xl font-semibold">Metas</h1>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm hover:border-[#4ADE80] hover:text-[#4ADE80]"
          >
            Volver al dashboard
          </Link>
        </div>

        <div className="mt-6">
          <NewGoalForm />
        </div>

        <section className="mt-6 grid gap-4">
          {goals.length > 0 ? (
            goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
              Todavía no tienes metas de ahorro. Crea la primera arriba.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
