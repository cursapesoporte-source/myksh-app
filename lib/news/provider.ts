import type { NewsProviderArticle } from "./types";

export interface NewsProvider {
  fetchLatest(): Promise<NewsProviderArticle[]>;
}
