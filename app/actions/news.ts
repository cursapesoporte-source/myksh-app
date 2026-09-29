"use server";

import { createClient } from "@/lib/supabase/server";
import type { NewsArticle, NewsListOptions } from "@/lib/news/types";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 30;

export async function getNews(options: NewsListOptions = {}): Promise<NewsArticle[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión para ver las noticias.");

  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  let query = supabase
    .from("news_cache")
    .select("id, title, summary, url, published_at, relevance_tags")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (options.tag?.trim()) {
    query = query.contains("relevance_tags", [options.tag.trim().toLowerCase()]);
  }

  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron cargar las noticias: ${error.message}`);
  return (data ?? []) as NewsArticle[];
}
