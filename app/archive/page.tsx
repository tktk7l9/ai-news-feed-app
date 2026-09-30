import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { ErrorBanner } from "@/components/ErrorBanner";
import { dateParts } from "@/lib/date";
import { getArchiveDates } from "@/lib/queries";

export const revalidate = 3600;

export const metadata: Metadata = { title: "アーカイブ" };

const DOW_JA = ["日", "月", "火", "水", "木", "金", "土"];

export default async function ArchiveIndex() {
  const { dates, error } = await getArchiveDates(120);
  const grouped = new Map<string, typeof dates>();
  for (const d of dates) {
    const ym = d.date.slice(0, 7);
    if (!grouped.has(ym)) grouped.set(ym, []);
    grouped.get(ym)!.push(d);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <BackLink href="/">トップに戻る</BackLink>
      <h1 className="text-2xl font-bold mt-4 mb-10 tracking-tight">アーカイブ</h1>

      {error ? (
        <ErrorBanner message={error} alternative={{ href: "/", label: "トップに戻る" }} />
      ) : dates.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">まだ過去のダイジェストがありません。</p>
      ) : (
        <div className="space-y-12">
          {[...grouped.entries()].map(([ym, items]) => {
            const year = Number(ym.slice(0, 4));
            const month = Number(ym.slice(5, 7));
            return (
              <section key={ym}>
                <div className="flex items-center gap-4 mb-5">
                  <h2 className="text-xs font-semibold tracking-[0.15em] text-neutral-600 dark:text-neutral-400 shrink-0">
                    {year}年{month}月
                  </h2>
                  <div className="flex-1 h-px bg-black/6 dark:bg-white/6" />
                </div>

                <div className="space-y-1">
                  {items.map((d) => {
                    const { day, dow: dowIndex } = dateParts(d.date);
                    const dow = DOW_JA[dowIndex];
                    const isSun = dowIndex === 0;
                    const isSat = dowIndex === 6;
                    // Weekend colours keep >= 4.5:1 on the cream background (SHIG 96, 95).
                    const dowColor = isSun
                      ? "text-rose-700 dark:text-rose-300"
                      : isSat
                        ? "text-amber-800 dark:text-amber-300"
                        : "text-neutral-600 dark:text-neutral-400";

                    return (
                      <Link
                        key={d.date}
                        href={`/archive/${d.date}`}
                        className="group flex items-start gap-4 px-4 py-3 rounded-xl
                                   hover:bg-amber-50/60 dark:hover:bg-amber-950/25
                                   transition-colors duration-150"
                      >
                        {/* Day number */}
                        <div className="w-8 shrink-0 text-right pt-px">
                          <span className="text-xl font-light text-neutral-700 dark:text-neutral-300 tabular-nums
                                           group-hover:text-amber-800 dark:group-hover:text-amber-400 transition-colors">
                            {day}
                          </span>
                        </div>

                        {/* Day of week */}
                        <div className="w-5 shrink-0 pt-1">
                          <span className={`text-xs font-medium ${dowColor}`}>{dow}</span>
                        </div>

                        {/* Overview */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed
                                        group-hover:text-neutral-900 dark:group-hover:text-neutral-100
                                        transition-colors line-clamp-2">
                            {d.overview_ja || `${year}年${month}月${day}日のダイジェスト`}
                          </p>
                        </div>

                        {/* Article count + arrow */}
                        <div className="shrink-0 flex items-center gap-2 pt-0.5">
                          <span className="text-xs px-2 py-0.5 rounded-full
                                           bg-neutral-100 dark:bg-neutral-800
                                           text-neutral-600 dark:text-neutral-400 tabular-nums">
                            {d.article_count}件
                          </span>
                          <span aria-hidden="true" className="text-neutral-500 dark:text-neutral-400
                                           group-hover:text-amber-700 transition-colors text-sm">
                            →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
