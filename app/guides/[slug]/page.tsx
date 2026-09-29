import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getGuide } from "@/lib/guides/content";
import RiskNotice from "@/components/guides/RiskNotice";

export const dynamic = "force-dynamic";

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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

  const guide = getGuide(slug);
  if (!guide) notFound();

  return (
    <main className="min-h-screen bg-[#0B0F14] px-6 py-10 text-[#E5E7EB]">
      <article className="mx-auto max-w-3xl">
        <Link href="/guides" className="text-sm text-[#4ADE80] hover:underline">
          ← Volver a las guías
        </Link>

        <div className="mt-10 flex items-center gap-3 text-xs text-white/45">
          <span className="rounded-full bg-white/10 px-2 py-1 text-white/60">
            {guide.level}
          </span>
          <span>{guide.readMinutes} min de lectura</span>
        </div>

        <h1 className="mt-4 text-3xl font-semibold leading-tight">{guide.title}</h1>
        <p className="mt-3 text-white/60">{guide.summary}</p>

        <div className="mt-6">
          <RiskNotice />
        </div>

        <div className="mt-8 space-y-8">
          {guide.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold text-white/95">{section.heading}</h2>

              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3 leading-7 text-white/70">
                  {paragraph}
                </p>
              ))}

              {section.bullets ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-white/70">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        {guide.links.length > 0 ? (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Enlaces oficiales</h2>
            <ul className="mt-3 space-y-2">
              {guide.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-[#4ADE80] hover:underline"
                  >
                    {link.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </main>
  );
}
