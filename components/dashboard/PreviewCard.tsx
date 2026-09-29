import Link from "next/link";
import type { ReactNode } from "react";

export default function PreviewCard({
  href,
  emoji,
  title,
  subtitle,
  actionLabel = "Ver todo",
  index = 0,
  className = "",
  children,
}: {
  href: string;
  emoji: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  index?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`myksh-fade-up flex flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-[#4ADE80]/35 hover:bg-white/[0.06] ${className}`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4ADE80]/10 text-xl">
            {emoji}
          </span>
          <div>
            <h2 className="text-base font-semibold text-white/95">{title}</h2>
            {subtitle ? <p className="text-xs text-white/45">{subtitle}</p> : null}
          </div>
        </div>
        <Link
          href={href}
          className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/70 transition hover:border-[#4ADE80] hover:text-[#4ADE80]"
        >
          {actionLabel} →
        </Link>
      </header>

      <div className="flex-1">{children}</div>
    </section>
  );
}
