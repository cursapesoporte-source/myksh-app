import type { NewsProviderArticle } from "./types";

function key(article: NewsProviderArticle): string {
  return (article.url || `${article.externalId}:${article.title}`).trim().toLowerCase();
}

export function dedupeNewsArticles(articles: NewsProviderArticle[]): NewsProviderArticle[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const articleKey = key(article);
    if (seen.has(articleKey)) return false;
    seen.add(articleKey);
    return true;
  });
}
