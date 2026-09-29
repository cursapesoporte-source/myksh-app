import type { NewsArticle } from "@/lib/news/types";

function formatDate(value: string | null) {
  if (!value) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-[#4ADE80]/40">
      <div className="flex items-center justify-between gap-3 text-xs text-white/45">
        <span>{formatDate(article.published_at)}</span>
        {article.relevance_tags?.[0] ? (
          <span className="rounded-full bg-white/10 px-2 py-1 text-white/60">
            {article.relevance_tags[0]}
          </span>
        ) : null}
      </div>

      <h2 className="mt-4 text-lg font-semibold leading-snug text-white/95">
        {article.title}
      </h2>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/60">
        {article.summary || "Consulta la fuente original para conocer los detalles de esta noticia."}
      </p>

      <div className="mt-auto pt-5">
        {article.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center rounded-xl border border-[#4ADE80]/40 px-4 py-2 text-sm font-medium text-[#4ADE80] transition hover:bg-[#4ADE80]/10"
          >
            Leer fuente original
          </a>
        ) : (
          <span className="text-xs text-white/35">Fuente no disponible</span>
        )}
      </div>
    </article>
  );
}
