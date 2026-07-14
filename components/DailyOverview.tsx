"use client";

import { formatJpDate } from "@/lib/date";

export function DailyOverview({
  date,
  overview,
  articleCount,
}: {
  date: string;
  overview: string;
  articleCount: number;
}) {
  return (
    <section className="relative mb-8">
      <div className="text-xs text-neutral-500 mb-1 flex items-center gap-2 flex-wrap">
        <span>
          {formatJpDate(date)} のダイジェスト · {articleCount}件
        </span>
      </div>
      <p className="text-base leading-relaxed text-neutral-800 dark:text-neutral-200 mb-3">
        {overview}
      </p>
    </section>
  );
}
