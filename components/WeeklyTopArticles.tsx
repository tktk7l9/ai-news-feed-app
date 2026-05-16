import type { Article } from "@/lib/types";
import { safeHref } from "@/lib/url";

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
            <a
              key={a.id}
              href={safeHref(a.url)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={a.title_ja?.trim() || `${a.source_name} の記事`}
              className="block px-4 py-3 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex gap-px" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-[10px] ${
                        i < a.importance
                          ? "text-amber-500"
                          : "text-neutral-300 dark:text-neutral-700"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-neutral-600 dark:text-neutral-400 tabular-nums">
                  {shortDate(a.digest_date)}
                </span>
              </div>
              <p className="text-[12px] font-medium leading-snug line-clamp-2
                            text-neutral-800 dark:text-neutral-200
                            group-hover:text-amber-700 dark:group-hover:text-amber-300
                            transition-colors">
                {a.title_ja?.trim() || `${a.source_name} の記事`}
              </p>
              <p className="text-[10px] text-neutral-600 dark:text-neutral-400 mt-1 truncate">
                {a.source_name}
              </p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
