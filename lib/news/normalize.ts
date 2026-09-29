import type { NewsProviderArticle } from "./types";

const CATEGORY_RULES: Array<{ category: string; terms: string[] }> = [
  { category: "cripto", terms: ["bitcoin", "btc", "ethereum", "eth", "crypto", "cryptocurrency", "solana", "blockchain"] },
  { category: "economia", terms: ["economy", "economic", "inflation", "interest rate", "central bank", "fed", "banco central", "inflación", "tasa de interés"] },
  { category: "peru", terms: ["peru", "perú", "lima", "bcp", "interbank", "bvl"] },
  { category: "fondos", terms: ["fund", "funds", "etf", "mutual fund", "fondo", "fondos"] },
  { category: "mercados", terms: ["market", "markets", "stock", "stocks", "shares", "equity", "nasdaq", "s&p 500", "dow jones", "wall street", "mercado", "acciones"] },
  { category: "inversiones", terms: ["investment", "investor", "portfolio", "valuation", "dividend", "investing", "inversión", "cartera"] },
];

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text || null;
}

function validUrl(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function validDate(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function categoryTags(article: NewsProviderArticle): string[] {
  const corpus = [article.title, article.summary, article.sourceName, ...article.tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const detected = CATEGORY_RULES
    .filter((rule) => rule.terms.some((term) => corpus.includes(term)))
    .map((rule) => rule.category);

  return detected.length > 0 ? detected.slice(0, 4) : ["mercados"];
}

export function normalizeTags(values: unknown): string[] {
  const source = Array.isArray(values) ? values : typeof values === "string" ? values.split(",") : [];
  return source
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, 12);
}

export function normalizeProviderArticle(article: NewsProviderArticle): NewsProviderArticle | null {
  const title = cleanText(article.title);
  if (!title) return null;

  const detectedTags = categoryTags(article);
  const providerTags = normalizeTags(article.tags);
  const tags = [...detectedTags, ...providerTags]
    .filter((tag, index, list) => list.indexOf(tag) === index)
    .slice(0, 8);

  return {
    externalId: cleanText(article.externalId) ?? `${title}:${article.publishedAt ?? ""}`,
    title,
    summary: cleanText(article.summary),
    url: validUrl(article.url),
    sourceName: cleanText(article.sourceName),
    publishedAt: validDate(article.publishedAt),
    tags,
    imageUrl: validUrl(article.imageUrl),
  };
}
