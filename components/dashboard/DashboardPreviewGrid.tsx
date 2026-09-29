import { getDashboardData } from "@/lib/dashboard/dashboard-data";
import {
  AccountsPreview,
  BudgetsPreview,
  GoalsPreview,
  GuidesPromo,
  InvestmentsPreview,
  NewsPreview,
  SubscriptionsPreview,
  TransactionsPreview,
} from "@/components/dashboard/DashboardPreviews";

export default async function DashboardPreviewGrid() {
  const data = await getDashboardData();

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <AccountsPreview
        accounts={data.accounts}
        totals={data.accountTotals}
        count={data.accountCount}
      />
      <TransactionsPreview transactions={data.transactions} />
      <BudgetsPreview budgets={data.budgets} />
      <GoalsPreview goals={data.goals} />
      <SubscriptionsPreview
        subscriptions={data.subscriptions}
        dueSoon={data.subscriptionsDueSoon}
      />
      <InvestmentsPreview
        investments={data.investments}
        totals={data.investmentTotals}
        count={data.investmentCount}
      />
      <NewsPreview articles={data.news} />
      <GuidesPromo />
    </div>
  );
}

export function DashboardPreviewSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className={`h-56 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04] ${
            item === 1 ? "lg:col-span-2" : ""
          }`}
        />
      ))}
    </div>
  );
}

export function FinancialOverviewSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
        <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
      </div>
      <div className="h-72 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
    </div>
  );
}
