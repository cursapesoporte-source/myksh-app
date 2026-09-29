import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTrackedSubscriptions } from "@/app/actions/subscriptions";
import NewSubscriptionForm from "@/components/subscriptions/NewSubscriptionForm";
import SubscriptionCard from "@/components/subscriptions/SubscriptionCard";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: subscriptionAccess } = await supabase
    .from("subscriptions")
    .select("access_until")
    .eq("user_id", user.id)
    .order("updated_by_admin_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscriptionAccess || new Date(subscriptionAccess.access_until) < new Date()) {
    redirect("/access-expired");
  }

  const subscriptions = await getTrackedSubscriptions();
  const activeSubs = subscriptions.filter((s) => s.isActive);

  const totalMonthlyPEN = activeSubs
    .filter((s) => s.currency === "PEN")
    .reduce((sum, s) => sum + s.monthlyEquivalent, 0);

  const dueThisMonthPEN = activeSubs
    .filter((s) => s.currency === "PEN" && s.dueThisMonth)
    .reduce((sum, s) => sum + s.amount, 0);

  const duplicateCount = subscriptions.filter((s) => s.possibleDuplicateOf.length > 0).length;

  return (
    <main className="min-h-screen bg-[#0B0F14] px-4 py-6 text-[#E5E7EB] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#4ADE80]">MyKSH</p>
            <h1 className="mt-2 text-3xl font-semibold">Suscripciones</h1>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm hover:border-[#4ADE80] hover:text-[#4ADE80]"
          >
            Volver al dashboard
          </Link>
        </div>

        {activeSubs.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/50">Total comprometido mensual (PEN)</p>
              <p className="mt-1 text-2xl font-semibold">S/{totalMonthlyPEN.toFixed(2)}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/50">Por pagar en el mes actual</p>
              <p className="mt-1 text-2xl font-semibold text-[#FBBF24]">S/{dueThisMonthPEN.toFixed(2)}</p>
            </div>

            {duplicateCount > 0 && (
              <div className="rounded-2xl border border-[#FBBF24]/30 bg-[#FBBF24]/10 p-5">
                <p className="text-sm text-[#FBBF24]">Posibles duplicados detectados</p>
                <p className="mt-1 text-2xl font-semibold text-[#FBBF24]">{duplicateCount}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6">
          <NewSubscriptionForm />
        </div>

        <section className="mt-6 grid gap-3">
          {subscriptions.length > 0 ? (
            subscriptions.map((sub) => <SubscriptionCard key={sub.id} sub={sub} />)
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
              Todavía no registras suscripciones recurrentes.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
