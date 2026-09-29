import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInvestments } from "@/app/actions/investments";
import { getExchangeRates } from "@/app/actions/exchange-rates";
import { getMultiCurrencyInvestmentAllocation } from "@/app/actions/allocation-multicurrency-actions";
import { getInvestmentPerformance } from "@/app/actions/investment-performance";
import InvestmentsClientPage from "@/components/investments/InvestmentsClientPage";

export default async function InvestmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("access_until")
    .eq("user_id", user.id)
    .order("updated_by_admin_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription || new Date(subscription.access_until) < new Date()) redirect("/access-expired");

  const [investments, rates, allocation, performance] = await Promise.all([
    getInvestments(),
    getExchangeRates(),
    getMultiCurrencyInvestmentAllocation("PEN"),
    getInvestmentPerformance("PEN"),
  ]);

  return <InvestmentsClientPage initialInvestments={investments} initialAllocation={[]} initialRates={rates} initialMultiCurrencyAllocation={allocation} initialPerformance={performance} />;
}
