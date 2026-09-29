import { createClient } from "@/lib/supabase/server";
import { getNews } from "@/app/actions/news";
import type { NewsArticle } from "@/lib/news/types";
import {
  addMonthsISO,
  daysBetweenISO,
  limaTodayISO,
  rollChargeDate,
} from "@/lib/dashboard/dashboard-format";

export type CurrencyTotal = { currency: string; total: number };

export type AccountPreview = {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
};

export type TransactionPreview = {
  id: string;
  description: string;
  accountName: string;
  categoryName: string | null;
  categoryIcon: string | null;
  amount: number;
  currency: string;
  type: string;
  occurredAt: string;
};

export type BudgetPreview = {
  id: string;
  name: string;
  icon: string | null;
  currency: string;
  limit: number;
  spent: number;
  percentage: number;
};

export type GoalPreview = {
  id: string;
  name: string;
  currency: string;
  target: number;
  current: number;
  percentage: number;
  targetDate: string | null;
};

export type SubscriptionPreview = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  nextChargeDate: string;
  daysLeft: number;
};

export type InvestmentPreview = {
  id: string;
  name: string;
  assetType: string;
  currency: string;
  value: number;
  returnPct: number | null;
};

export type DashboardData = {
  accounts: AccountPreview[];
  accountCount: number;
  accountTotals: CurrencyTotal[];
  transactions: TransactionPreview[];
  budgets: BudgetPreview[];
  goals: GoalPreview[];
  subscriptions: SubscriptionPreview[];
  subscriptionsDueSoon: number;
  investments: InvestmentPreview[];
  investmentCount: number;
  investmentTotals: CurrencyTotal[];
  news: NewsArticle[];
};

const EMPTY_DATA: DashboardData = {
  accounts: [],
  accountCount: 0,
  accountTotals: [],
  transactions: [],
  budgets: [],
  goals: [],
  subscriptions: [],
  subscriptionsDueSoon: 0,
  investments: [],
  investmentCount: 0,
  investmentTotals: [],
  news: [],
};

type AccountRow = {
  id: string;
  name: string | null;
  type: string | null;
  currency: string | null;
  balance: number | string | null;
};

type CategoryRow = { id: string; name: string | null; icon: string | null };

type TransactionRow = {
  id: string;
  account_id: string | null;
  category_id: string | null;
  amount: number | string | null;
  currency: string | null;
  type: string | null;
  description: string | null;
  occurred_at: string;
};

type BudgetRow = {
  id: string;
  category_id: string;
  monthly_limit: number | string | null;
  currency: string | null;
};

type SpendRow = {
  category_id: string | null;
  amount: number | string | null;
  currency: string | null;
};

type GoalRow = {
  id: string;
  name: string | null;
  target_amount: number | string | null;
  current_amount: number | string | null;
  currency: string | null;
  target_date: string | null;
};

type SubscriptionRow = {
  id: string;
  service_name: string | null;
  amount: number | string | null;
  currency: string | null;
  billing_cycle: string | null;
  next_charge_date: string | null;
  billing_day: number | null;
};

type InvestmentRow = {
  id: string;
  asset_type: string | null;
  name: string | null;
  quantity: number | string | null;
  purchase_price: number | string | null;
  current_price: number | string | null;
  currency: string | null;
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function currencyRank(currency: string): number {
  if (currency === "PEN") return 0;
  if (currency === "USD") return 1;
  return 2;
}

function totalsByCurrency(items: { currency: string; amount: number }[]): CurrencyTotal[] {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.currency, (map.get(item.currency) ?? 0) + item.amount);
  }
  return Array.from(map, ([currency, total]) => ({ currency, total: round2(total) })).sort(
    (a, b) => currencyRank(a.currency) - currencyRank(b.currency) || a.currency.localeCompare(b.currency),
  );
}

async function rows<T>(
  label: string,
  query: PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T[]> {
  try {
    const { data, error } = await query;
    if (error) {
      console.error(`[dashboard] ${label}:`, error);
      return [];
    }
    return Array.isArray(data) ? (data as T[]) : [];
  } catch (error) {
    console.error(`[dashboard] ${label}:`, error);
    return [];
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return EMPTY_DATA;

    const userId = user.id;
    const today = limaTodayISO();
    const monthKey = today.slice(0, 7);
    const monthStart = `${monthKey}-01T00:00:00-05:00`;
    const monthEnd = `${addMonthsISO(`${monthKey}-01`, 1)}T00:00:00-05:00`;

    const [
      accountRows,
      categoryRows,
      transactionRows,
      budgetRows,
      spendRows,
      goalRows,
      subscriptionRows,
      investmentRows,
      news,
    ] = await Promise.all([
      rows<AccountRow>(
        "accounts",
        supabase.from("accounts").select("id, name, type, currency, balance").eq("user_id", userId).limit(100),
      ),
      rows<CategoryRow>("categories", supabase.from("categories").select("id, name, icon").limit(300)),
      rows<TransactionRow>(
        "transactions",
        supabase
          .from("transactions")
          .select("id, account_id, category_id, amount, currency, type, description, occurred_at")
          .eq("user_id", userId)
          .order("occurred_at", { ascending: false })
          .limit(5),
      ),
      rows<BudgetRow>(
        "budgets",
        supabase.from("budgets").select("id, category_id, monthly_limit, currency").eq("user_id", userId),
      ),
      rows<SpendRow>(
        "spend",
        supabase
          .from("transactions")
          .select("category_id, amount, currency")
          .eq("user_id", userId)
          .eq("type", "gasto")
          .or("excluded_from_reports.is.null,excluded_from_reports.eq.false")
          .gte("occurred_at", monthStart)
          .lt("occurred_at", monthEnd),
      ),
      rows<GoalRow>(
        "goals",
        supabase
          .from("goals")
          .select("id, name, target_amount, current_amount, currency, target_date")
          .eq("user_id", userId)
          .limit(50),
      ),
      rows<SubscriptionRow>(
        "subscriptions_tracked",
        supabase
          .from("subscriptions_tracked")
          .select("id, service_name, amount, currency, billing_cycle, next_charge_date, billing_day")
          .eq("user_id", userId)
          .eq("is_active", true)
          .limit(100),
      ),
      rows<InvestmentRow>(
        "investments",
        supabase
          .from("investments")
          .select("id, asset_type, name, quantity, purchase_price, current_price, currency")
          .eq("user_id", userId)
          .limit(100),
      ),
      getNews({ limit: 2 }).catch((error) => {
        console.error("[dashboard] news:", error);
        return [] as NewsArticle[];
      }),
    ]);

    const categoryMap = new Map(categoryRows.map((category) => [category.id, category]));
    const accountMap = new Map(accountRows.map((account) => [account.id, account]));

    const allAccounts: AccountPreview[] = accountRows.map((account) => ({
      id: account.id,
      name: account.name ?? "Cuenta",
      type: account.type ?? "banco",
      currency: (account.currency ?? "PEN").toUpperCase(),
      balance: toNumber(account.balance),
    }));

    const accounts = [...allAccounts]
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 4);

    const transactions: TransactionPreview[] = transactionRows.map((transaction) => {
      const category = transaction.category_id ? categoryMap.get(transaction.category_id) : undefined;
      const account = transaction.account_id ? accountMap.get(transaction.account_id) : undefined;
      return {
        id: transaction.id,
        description: transaction.description?.trim() || "Sin descripción",
        accountName: account?.name ?? "Cuenta",
        categoryName: category?.name ?? null,
        categoryIcon: category?.icon ?? null,
        amount: toNumber(transaction.amount),
        currency: (transaction.currency ?? "PEN").toUpperCase(),
        type: transaction.type ?? "gasto",
        occurredAt: transaction.occurred_at,
      };
    });

    const spentMap = new Map<string, number>();
    for (const spend of spendRows) {
      const key = `${spend.category_id}|${(spend.currency ?? "PEN").toUpperCase()}`;
      spentMap.set(key, (spentMap.get(key) ?? 0) + toNumber(spend.amount));
    }

    const budgets: BudgetPreview[] = budgetRows
      .map((budget) => {
        const currency = (budget.currency ?? "PEN").toUpperCase();
        const limit = toNumber(budget.monthly_limit);
        const spent = spentMap.get(`${budget.category_id}|${currency}`) ?? 0;
        const category = categoryMap.get(budget.category_id);
        return {
          id: budget.id,
          name: category?.name ?? "Categoría",
          icon: category?.icon ?? null,
          currency,
          limit,
          spent: round2(spent),
          percentage: limit > 0 ? Math.round((spent / limit) * 100) : 0,
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);

    const goals: GoalPreview[] = goalRows
      .map((goal) => {
        const target = toNumber(goal.target_amount);
        const current = toNumber(goal.current_amount);
        return {
          id: goal.id,
          name: goal.name ?? "Meta",
          currency: (goal.currency ?? "PEN").toUpperCase(),
          target,
          current,
          percentage: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
          targetDate: goal.target_date,
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 3);

    const allSubscriptions: SubscriptionPreview[] = subscriptionRows
      .filter((subscription) => Boolean(subscription.next_charge_date))
      .map((subscription) => {
        const nextChargeDate = rollChargeDate(
          subscription.next_charge_date as string,
          subscription.billing_cycle,
          subscription.billing_day,
          today,
        );
        return {
          id: subscription.id,
          name: subscription.service_name ?? "Suscripción",
          amount: toNumber(subscription.amount),
          currency: (subscription.currency ?? "PEN").toUpperCase(),
          nextChargeDate,
          daysLeft: daysBetweenISO(today, nextChargeDate),
        };
      })
      .sort((a, b) => a.nextChargeDate.localeCompare(b.nextChargeDate));

    const investmentsAll: InvestmentPreview[] = investmentRows.map((investment) => {
      const quantity = toNumber(investment.quantity);
      const purchase = toNumber(investment.purchase_price);
      const current = toNumber(investment.current_price);
      return {
        id: investment.id,
        name: investment.name ?? "Inversión",
        assetType: investment.asset_type ?? "",
        currency: (investment.currency ?? "PEN").toUpperCase(),
        value: round2(quantity * current),
        returnPct: purchase > 0 && current > 0 ? round2((current / purchase - 1) * 100) : null,
      };
    });

    return {
      accounts,
      accountCount: allAccounts.length,
      accountTotals: totalsByCurrency(
        allAccounts.map((account) => ({ currency: account.currency, amount: account.balance })),
      ),
      transactions,
      budgets,
      goals,
      subscriptions: allSubscriptions.slice(0, 4),
      subscriptionsDueSoon: allSubscriptions.filter((subscription) => subscription.daysLeft <= 7).length,
      investments: [...investmentsAll].sort((a, b) => b.value - a.value).slice(0, 3),
      investmentCount: investmentsAll.length,
      investmentTotals: totalsByCurrency(
        investmentsAll.map((investment) => ({ currency: investment.currency, amount: investment.value })),
      ),
      news,
    };
  } catch (error) {
    console.error("[dashboard] getDashboardData:", error);
    return EMPTY_DATA;
  }
}
