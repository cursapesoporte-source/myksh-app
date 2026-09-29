import type { NewsArticle } from "@/lib/news/types";
import NewsCard from "./NewsCard";

export default function NewsFeed({ articles }: { articles: NewsArticle[] }) {
  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-14 text-center">
        <p className="text-lg font-medium text-white/80">Todavía no hay noticias disponibles.</p>
        <p className="mt-2 text-sm text-white/45">
          El feed aparecerá cuando se complete la primera actualización automática.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {articles.map((article) => (
        <NewsCard key={article.id} article={article} />
      ))}
    </div>
  );
}
