import type { Article } from "@/lib/types";
import { safeHref } from "@/lib/url";
import { CategoryBadge } from "./CategoryBadge";
import { ExternalMark } from "./ExternalMark";
import { ImportanceStars } from "./ImportanceStars";

export function ArticleCard({
  article,
  headingLevel = 2,
}: {
  article: Article;
  headingLevel?: 2 | 3;
}) {
  const isRelease = article.is_model_release;
  const Heading = headingLevel === 3 ? "h3" : "h2";

  return (
    <article
      className={[
        // The whole card is the hotspot via the title's stretched ::after (SHIG 93);
        // the focus ring follows the card so it stays visible on tinted backgrounds (SHIG 94).
        "relative rounded-xl p-4 transition-all backdrop-blur-sm",
        "has-[a[data-card-link]:focus-visible]:ring-2 has-[a[data-card-link]:focus-visible]:ring-amber-600 has-[a[data-card-link]:focus-visible]:ring-offset-2",
        isRelease
          ? "border border-amber-400/70 dark:border-amber-600/50 bg-amber-50/80 dark:bg-amber-950/20 hover:border-amber-500 dark:hover:border-amber-500"
          : "border border-black/6 dark:border-white/10 bg-white/75 dark:bg-black/40 hover:border-amber-300 dark:hover:border-amber-700",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2 text-xs text-neutral-600 dark:text-neutral-400">
        {isRelease && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                           bg-amber-700 text-white text-xs font-bold tracking-wide shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-white/80 motion-safe:animate-pulse" aria-hidden="true" />
            NEW MODEL
          </span>
        )}
        <CategoryBadge category={article.category} />
        <span className="whitespace-nowrap">
          <span aria-hidden="true" className="mr-2">·</span>
          {article.source_name}
        </span>
        <ImportanceStars value={article.importance} className="ml-auto text-neutral-700 dark:text-neutral-300" />
      </div>
      <Heading className="text-base font-semibold leading-snug mb-2">
        <a
          href={safeHref(article.url)}
          target="_blank"
          rel="noopener noreferrer"
          data-card-link=""
          className="hover:text-amber-700 dark:hover:text-amber-400 focus-visible:outline-none
                     after:absolute after:inset-0 after:rounded-xl after:content-['']"
        >
          {article.title_ja?.trim() || `${article.source_name} の記事`}
          <ExternalMark />
        </a>
      </Heading>
      <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{article.summary_ja}</p>
    </article>
  );
}
