export type NewsArticle = {
  id: string;
  title: string;
  summary: string | null;
  url: string | null;
  published_at: string | null;
  relevance_tags: string[] | null;
};

export type NewsProviderArticle = {
  externalId: string;
  title: string;
  summary: string | null;
  url: string | null;
  sourceName: string | null;
  publishedAt: string | null;
  tags: string[];
  imageUrl: string | null;
};

export type NewsListOptions = {
  limit?: number;
  tag?: string;
};
