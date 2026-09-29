import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import FinancialOverview from "@/components/dashboard/FinancialOverview";
import DashboardBackground from "@/components/dashboard/DashboardBackground";
import QuickActions from "@/components/dashboard/QuickActions";
import ThemeToggle from "@/components/dashboard/ThemeToggle";
import DashboardPreviewGrid, { DashboardPreviewSkeleton, FinancialOverviewSkeleton } from "@/components/dashboard/DashboardPreviewGrid";
import { greetingFor, longDateLabel } from "@/lib/dashboard/dashboard-format";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, locale, role").eq("id", user.id).maybeSingle();
  const { data: subscription } = await supabase.from("subscriptions").select("access_until, status").eq("user_id", user.id).order("updated_by_admin_at", { ascending: false }).limit(1).maybeSingle();
  if (!subscription || new Date(subscription.access_until) < new Date()) redirect("/access-expired");

  const accessUntil = new Date(subscription.access_until);
  const daysLeft = Math.max(0, Math.ceil((accessUntil.getTime() - Date.now()) / 86400000));
  const firstName = profile?.full_name ? String(profile.full_name).split(" ")[0] : null;
  const isActive = String(subscription.status).toLowerCase() === "active";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--myksh-bg)] text-[var(--myksh-text)] transition-colors duration-200">
      <DashboardBackground />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[var(--myksh-green)]">MYKSH</p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={signOut}><button type="submit" className="min-h-11 rounded-xl border border-[var(--myksh-border)] bg-[var(--myksh-surface-soft)] px-4 py-2 text-sm font-medium text-[var(--myksh-text)] backdrop-blur-md transition hover:border-[var(--myksh-green)] hover:text-[var(--myksh-green)]">Cerrar sesión</button></form>
          </div>
        </header>
        <section className="myksh-fade-up mt-8 rounded-3xl border border-[var(--myksh-border)] bg-[var(--myksh-surface-soft)] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.3)] backdrop-blur-md sm:p-8">
          <p className="text-sm text-[var(--myksh-muted)]">{longDateLabel()}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{greetingFor()}{firstName ? `, ${firstName}` : ""} <span aria-hidden="true">👋</span></h1>
          <p className="mt-2 text-[var(--myksh-muted)]">Tu espacio financiero, todo en un solo lugar.</p>
          <div className="mt-6 flex flex-wrap gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-[var(--myksh-border)] bg-[var(--myksh-surface-soft)] px-4 py-2 text-sm"><span className={`h-2 w-2 rounded-full ${isActive ? "bg-[var(--myksh-green)] shadow-[0_0_10px_var(--myksh-green)]" : "bg-[#F87171]"}`} />{isActive ? "Cuenta activa" : String(subscription.status)}</span><span className="inline-flex items-center gap-2 rounded-full border border-[var(--myksh-border)] bg-[var(--myksh-surface-soft)] px-4 py-2 text-sm">🗓️ Acceso hasta {accessUntil.toLocaleDateString("es-PE")}<span className="text-[var(--myksh-muted)]">· {daysLeft} {daysLeft === 1 ? "día" : "días"}</span></span><span className="inline-flex items-center gap-2 rounded-full border border-[var(--myksh-border)] bg-[var(--myksh-surface-soft)] px-4 py-2 text-sm">💱 Moneda base PEN</span></div>
        </section>
        <QuickActions />
        <section className="mt-10"><Suspense fallback={<FinancialOverviewSkeleton />}><FinancialOverview /></Suspense></section>
        <section className="mt-10"><h2 className="mb-4 text-lg font-semibold text-[var(--myksh-text)]">Vista rápida de tus secciones</h2><Suspense fallback={<DashboardPreviewSkeleton />}><DashboardPreviewGrid /></Suspense></section>
        <footer className="mt-12 text-center text-xs text-[var(--myksh-muted)]">MYKSH · Contenido informativo, no constituye asesoría financiera.</footer>
      </div>
    </main>
  );
}
