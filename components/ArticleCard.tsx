import type { Article } from "@/lib/types";
import { safeHref } from "@/lib/url";
import { AudioPlayer } from "./AudioPlayer";
import { CategoryBadge } from "./CategoryBadge";

export function ArticleCard({ article }: { article: Article }) {
  const isRelease = article.is_model_release;

  return (
    <article
      className={[
        "rounded-xl p-4 transition-colors backdrop-blur-sm",
        isRelease
          ? "border border-amber-400/70 dark:border-amber-600/50 bg-amber-50/80 dark:bg-amber-950/20 hover:border-amber-500 dark:hover:border-amber-500"
          : "border border-black/6 dark:border-white/10 bg-white/75 dark:bg-black/40 hover:border-amber-300 dark:hover:border-amber-700",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 mb-2 text-xs text-neutral-600 dark:text-neutral-400">
        {isRelease && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                           bg-amber-700 text-white text-[10px] font-bold tracking-wide shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
            NEW MODEL
          </span>
        )}
        <CategoryBadge category={article.category} />
        <span aria-hidden="true">·</span>
        <span>{article.source_name}</span>
        <span className="ml-auto flex items-center gap-2">
          <span aria-label="重要度">
            {"★".repeat(article.importance)}
            <span className="text-neutral-400 dark:text-neutral-600" aria-hidden="true">
              {"★".repeat(5 - article.importance)}
            </span>
          </span>
          <AudioPlayer
            type="article"
            id={article.id}
            initialUrl={article.audio_url}
            label="この記事"
          />
        </span>
      </div>
      <h2 className="text-base font-semibold leading-snug mb-2">
        <a
          href={safeHref(article.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-amber-700 dark:hover:text-amber-400"
        >
          {article.title_ja?.trim() || `${article.source_name} の記事`}
        </a>
      </h2>
      <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{article.summary_ja}</p>
    </article>
  );
}
