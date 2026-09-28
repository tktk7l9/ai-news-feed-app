import Link from "next/link";
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

// Each row links to its category page, with the same labels the article badges use (SHIG 35, 37, 33, 6).
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
        <ul className="px-2 py-2">
          {stats.map(({ category, count }) => (
            <li key={category}>
              <Link
                href={`/category/${category}`}
                prefetch={false}
                className="group block rounded-lg px-2 py-2 hover:bg-amber-50/60 dark:hover:bg-amber-950/25 transition-colors"
              >
                <span className="flex items-center justify-between mb-1 text-xs text-neutral-700 dark:text-neutral-300">
                  <span className="group-hover:underline underline-offset-2">{CATEGORY_LABELS[category]}</span>
                  <span className="tabular-nums">{count}件</span>
                </span>
                <span className="block h-1.5 bg-black/5 dark:bg-white/5 rounded-full" aria-hidden="true">
                  <span
                    className={`block h-1.5 rounded-full transition-all ${BAR_COLOR[category]}`}
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
