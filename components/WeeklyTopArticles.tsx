import type { Article } from "@/lib/types";
import { safeHref } from "@/lib/url";
import { ExternalMark } from "./ExternalMark";
import { ImportanceStars } from "./ImportanceStars";

function shortDate(isoDate: string) {
  const [, m, d] = isoDate.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function WeeklyTopArticles({ articles }: { articles: Article[] }) {
  return (
    <section className="rounded-2xl border border-black/6 dark:border-white/8 bg-white/70 dark:bg-black/40 backdrop-blur-md overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-black/6 dark:border-white/8">
        <h2 className="text-xs font-semibold tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">
          今週の注目
        </h2>
      </div>

      {articles.length === 0 ? (
        <p className="px-4 py-4 text-xs text-neutral-600 dark:text-neutral-400">まだ高重要度の記事がありません</p>
      ) : (
        <div className="divide-y divide-black/4 dark:divide-white/5">
          {articles.map((a) => (
            // No aria-label: the visible text (importance, date, title, source) is richer (SHIG 94).
            <a
              key={a.id}
              href={safeHref(a.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors group"
            >
              <span className="flex items-center justify-between mb-1 text-xs">
                <ImportanceStars value={a.importance} className="text-amber-700 dark:text-amber-400" />
                <span className="text-neutral-600 dark:text-neutral-400 tabular-nums">
                  {shortDate(a.digest_date)}
                </span>
              </span>
              <span className="block text-sm font-medium leading-snug line-clamp-2
                            text-neutral-800 dark:text-neutral-200
                            group-hover:text-amber-700 dark:group-hover:text-amber-300
                            transition-colors">
                {a.title_ja?.trim() || `${a.source_name} の記事`}
                <ExternalMark />
              </span>
              <span className="block text-xs text-neutral-600 dark:text-neutral-400 mt-1 truncate">
                {a.source_name}
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
