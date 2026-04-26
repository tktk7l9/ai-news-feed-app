import type { Article } from "@/lib/types";

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
        <p className="px-4 py-4 text-xs text-neutral-400">まだ高重要度の記事がありません</p>
      ) : (
        <div className="divide-y divide-black/4 dark:divide-white/5">
          {articles.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex gap-px">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-[10px] ${
                        i < a.importance
                          ? "text-amber-400"
                          : "text-neutral-200 dark:text-neutral-700"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 tabular-nums">
                  {shortDate(a.digest_date)}
                </span>
              </div>
              <p className="text-[12px] font-medium leading-snug line-clamp-2
                            text-neutral-800 dark:text-neutral-200
                            group-hover:text-indigo-700 dark:group-hover:text-indigo-300
                            transition-colors">
                {a.title_ja}
              </p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 truncate">
                {a.source_name}
              </p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
