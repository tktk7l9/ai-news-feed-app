import { digestTitle } from "@/lib/display";

// The date line is the page heading so screen readers and tabs know which day this is (SHIG 94, 59).
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
      <h1 className="text-lg font-semibold tracking-tight mb-2 flex flex-wrap items-baseline gap-x-2">
        <span>{digestTitle(date)}</span>
        <span className="text-sm font-normal text-neutral-600 dark:text-neutral-400">{articleCount}件</span>
      </h1>
      <p className="text-base leading-relaxed text-neutral-800 dark:text-neutral-200 mb-3">
        {overview}
      </p>
    </section>
  );
}
