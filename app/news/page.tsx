import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getNews } from "@/app/actions/news";
import NewsFeed from "@/components/news/NewsFeed";
import type { NewsArticle } from "@/lib/news/types";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
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

  if (!subscription || new Date(subscription.access_until) < new Date()) {
    redirect("/access-expired");
  }

  let articles: NewsArticle[] = [];
  let errorMessage: string | null = null;
  try {
    articles = await getNews({ limit: 12 });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "No se pudieron cargar las noticias.";
  }

  return (
    <main className="min-h-screen bg-[#0B0F14] px-6 py-10 text-[#E5E7EB]">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm text-[#4ADE80] hover:underline">
          ← Volver al dashboard
        </Link>
        <p className="mt-10 text-sm uppercase tracking-[0.25em] text-[#4ADE80]">MyKSH</p>
        <h1 className="mt-3 text-4xl font-semibold">Noticias financieras</h1>
        <p className="mt-3 max-w-2xl text-white/60">
          Información reciente sobre mercados, economía e inversiones. Contenido informativo; no constituye asesoría financiera.
        </p>
        {errorMessage ? (
          <div className="mt-8 rounded-2xl border border-[#F87171]/30 bg-[#F87171]/10 p-5 text-sm text-[#FCA5A5]">
            {errorMessage}
          </div>
        ) : (
          <div className="mt-8"><NewsFeed articles={articles} /></div>
        )}
      </div>
    </main>
  );
}
