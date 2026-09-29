import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { MarketauxNewsProvider } from "@/lib/news/marketaux";
import { dedupeNewsArticles } from "@/lib/news/dedupe";
import { normalizeProviderArticle } from "@/lib/news/normalize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const configuredSecrets = [
    process.env.CRON_SECRET,
    process.env.NEWS_REFRESH_SECRET,
  ].filter((secret): secret is string => Boolean(secret?.trim()));

  if (configuredSecrets.length === 0) return false;

  const authorization = request.headers.get("authorization") ?? "";
  const providedSecret = authorization.replace(/^Bearer\s+/i, "").trim();
  return configuredSecrets.some((secret) => providedSecret === secret.trim());
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const providerArticles = await new MarketauxNewsProvider().fetchLatest();
    const articles = dedupeNewsArticles(
      providerArticles
        .map(normalizeProviderArticle)
        .filter((article): article is NonNullable<typeof article> => article !== null),
    );

    const rows = articles.map((article) => ({
      title: article.title,
      summary: article.summary,
      url: article.url,
      published_at: article.publishedAt,
      relevance_tags: article.tags,
    }));

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, skipped: 0, message: "Sin artículos válidos." });
    }

    const supabase = createServiceRoleClient();
    const { data: inserted, error } = await supabase.rpc(
      "insert_news_cache_from_refresh",
      { news_rows: rows } as never,
    );

    if (error) {
      throw new Error(`No se pudieron guardar las noticias mediante RPC: ${error.message}`);
    }

    const insertedCount = Number(inserted ?? 0);
    return NextResponse.json({
      ok: true,
      inserted: insertedCount,
      skipped: rows.length - insertedCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al actualizar las noticias.";
    console.error("[news/refresh]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
