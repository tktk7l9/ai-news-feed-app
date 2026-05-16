import type { Category } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

const BAR_COLOR: Record<Category, string> = {
  llm:      "bg-indigo-400 dark:bg-indigo-500",
  image:    "bg-pink-400   dark:bg-pink-500",
  research: "bg-emerald-400 dark:bg-emerald-500",
  product:  "bg-amber-400  dark:bg-amber-500",
  business: "bg-sky-400    dark:bg-sky-500",
  tool:     "bg-purple-400 dark:bg-purple-500",
  other:    "bg-neutral-400 dark:bg-neutral-500",
};

const LABEL_SHORT: Record<Category, string> = {
  llm:      "LLM",
  image:    "画像",
  research: "研究",
  product:  "製品",
  business: "業界",
  tool:     "ツール",
  other:    "その他",
};

export function WeeklyStats({ stats }: { stats: { category: Category; count: number }[] }) {
  const total = stats.reduce((s, r) => s + r.count, 0);
  const max   = stats[0]?.count ?? 1;

  return (
    <section className="rounded-2xl border border-black/6 dark:border-white/8 bg-white/70 dark:bg-black/40 backdrop-blur-md overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-black/6 dark:border-white/8 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">
          今週のカテゴリ
        </h2>
        <span className="text-xs font-semibold tabular-nums text-neutral-600 dark:text-neutral-400">
          {total}件
        </span>
      </div>

      {total === 0 ? (
        <p className="px-4 py-4 text-xs text-neutral-600 dark:text-neutral-400">まだ記事がありません</p>
      ) : (
        <div className="px-4 py-3 space-y-2">
          {stats.map(({ category, count }) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  {LABEL_SHORT[category]}
                </span>
                <span className="text-[11px] tabular-nums text-neutral-600 dark:text-neutral-400">
                  {count}
                </span>
              </div>
              <div className="h-1.5 bg-black/5 dark:bg-white/5 rounded-full">
                <div
                  className={`h-1.5 rounded-full transition-all ${BAR_COLOR[category]}`}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
