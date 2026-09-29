import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewAccountForm from "@/components/accounts/NewAccountForm";
import AccountCard from "@/components/accounts/AccountCard";

export default async function AccountsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select(
      "id, name, type, currency, balance, alias, account_number, phone_number, parent_account_id"
    )
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const bankAccounts = (accounts ?? [])
    .filter((account) => account.type === "banco")
    .map((account) => ({ id: account.id, name: account.name }));

  return (
    <main className="min-h-screen bg-[#0B0F14] px-4 py-6 text-[#E5E7EB] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#4ADE80]">
              MyKSH
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Cuentas</h1>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm hover:border-[#4ADE80] hover:text-[#4ADE80]"
          >
            Volver al dashboard
          </Link>
        </div>

        <div className="mt-8">
          <NewAccountForm bankAccounts={bankAccounts} />
        </div>

        <section className="mt-6 grid gap-4">
          {accounts?.length ? (
            accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
              Todavía no tienes cuentas registradas.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
