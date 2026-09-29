import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewTransactionForm from "@/components/transactions/NewTransactionForm";
import TransactionsList from "@/components/transactions/TransactionsList";

export default async function TransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  const [{ data: accounts }, { data: categories }, { data: transactions }] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, currency")
        .order("name", { ascending: true }),
      supabase
        .from("categories")
        .select("id, name, type")
        .order("name", { ascending: true }),
      supabase
        .from("transactions")
        .select(
          "id, amount, type, description, occurred_at, currency, account_id, category_id"
        )
        .order("occurred_at", { ascending: false })
        .limit(50),
    ]);

  const accountsById = new Map(
    (accounts ?? []).map((account) => [account.id, account.name])
  );
  const categoriesById = new Map(
    (categories ?? []).map((category) => [category.id, category.name])
  );

  const enrichedTransactions = (transactions ?? []).map((transaction) => ({
    ...transaction,
    account_name: accountsById.get(transaction.account_id) ?? "Cuenta eliminada",
    category_name: transaction.category_id
      ? categoriesById.get(transaction.category_id) ?? null
      : null,
  }));

  return (
    <main className="min-h-screen bg-[#0B0F14] px-4 py-6 text-[#E5E7EB] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#4ADE80]">
              MyKSH
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Transacciones</h1>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm hover:border-[#4ADE80] hover:text-[#4ADE80]"
          >
            Volver al dashboard
          </Link>
        </div>

        <div className="mt-8">
          <NewTransactionForm
            accounts={accounts ?? []}
            categories={categories ?? []}
          />
        </div>

        <section className="mt-6">
          <TransactionsList
            transactions={enrichedTransactions}
            categories={categories ?? []}
          />
        </section>
      </div>
    </main>
  );
}
