import type { NewsProvider } from "./provider";
import type { NewsProviderArticle } from "./types";

const ENDPOINT = "https://api.marketaux.com/v1/news/all";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const result = text(value);
    if (result) return result;
  }
  return null;
}

export class MarketauxNewsProvider implements NewsProvider {
  async fetchLatest(): Promise<NewsProviderArticle[]> {
    const token = process.env.MARKETAUX_API_TOKEN;
    if (!token) throw new Error("Falta MARKETAUX_API_TOKEN.");

    const params = new URLSearchParams({
      api_token: token,
      language: "es,en",
      countries: "pe,us",
      filter_entities: "true",
      limit: "3",
      search: "finance OR markets OR economy OR investing OR cryptocurrency OR Peru",
    });

    const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error(`Marketaux respondió HTTP ${response.status}.`);

    const payload = (await response.json()) as { data?: unknown[] };
    if (!Array.isArray(payload.data)) return [];

    return payload.data.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const article = item as Record<string, unknown>;
      const source = article.source as Record<string, unknown> | null;
      const entities = Array.isArray(article.entities) ? article.entities : [];
      const tags = entities.flatMap((entity) => {
        if (!entity || typeof entity !== "object") return [];
        const name = text((entity as Record<string, unknown>).name);
        return name ? [name] : [];
      });

      return [{
        externalId: firstText(article.uuid, article.id, article.url) ?? crypto.randomUUID(),
        title: firstText(article.title) ?? "",
        summary: firstText(article.description, article.snippet),
        url: firstText(article.url),
        sourceName: firstText(article.source, source?.name),
        publishedAt: firstText(article.published_at, article.publishedAt),
        tags,
        imageUrl: firstText(article.image_url, article.imageUrl),
      }];
    });
  }
}
