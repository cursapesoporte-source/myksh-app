import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, locale, role")
    .eq("id", user.id)
    .maybeSingle();

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

  return (
    <main className="min-h-screen bg-[#0B0F14] px-6 py-10 text-[#E5E7EB]">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-[0.25em] text-[#4ADE80]">
          MyKSH
        </p>

        <h1 className="mt-3 text-4xl font-semibold">
          Hola{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>

        <p className="mt-3 text-white/60">
          Tu espacio financiero está listo.
        </p>

        <section className="mt-10 grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-white/50">Estado</p>
            <p className="mt-2 text-xl font-semibold text-[#4ADE80]">
              {subscription.status}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-white/50">Acceso hasta</p>
            <p className="mt-2 text-xl font-semibold">
              {new Date(subscription.access_until).toLocaleDateString("es-PE")}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-white/50">Moneda base</p>
            <p className="mt-2 text-xl font-semibold">PEN</p>
          </div>
        </section>
      </div>
    </main>
  );
}