import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GUIDES } from "@/lib/guides/content";
import RiskNotice from "@/components/guides/RiskNotice";

export const dynamic = "force-dynamic";

export default async function GuidesPage() {
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

  return (
    <main className="min-h-screen bg-[#0B0F14] px-6 py-10 text-[#E5E7EB]">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm text-[#4ADE80] hover:underline">
          ← Volver al dashboard
        </Link>

        <p className="mt-10 text-sm uppercase tracking-[0.25em] text-[#4ADE80]">MyKSH</p>
        <h1 className="mt-3 text-4xl font-semibold">Guías de inversión</h1>
        <p className="mt-3 max-w-2xl text-white/60">
          Aprende lo básico de cada tipo de activo y cómo registrarlo en MYKSH.
        </p>

        <div className="mt-6">
          <RiskNotice />
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-[#4ADE80]/40"
            >
              <div className="flex items-center justify-between gap-3 text-xs text-white/45">
                <span className="rounded-full bg-white/10 px-2 py-1 text-white/60">
                  {guide.level}
                </span>
                <span>{guide.readMinutes} min de lectura</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold leading-snug text-white/95">
                {guide.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/60">{guide.summary}</p>
              <span className="mt-auto pt-5 text-sm font-medium text-[#4ADE80]">
                Leer guía →
              </span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
