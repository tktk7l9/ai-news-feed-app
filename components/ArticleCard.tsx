import type { Article } from "@/lib/types";
import { CategoryBadge } from "./CategoryBadge";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="border border-black/6 dark:border-white/10 rounded-xl p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors bg-white/75 dark:bg-black/40 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2 text-xs text-neutral-500">
        <CategoryBadge category={article.category} />
        <span>·</span>
        <span>{article.source_name}</span>
        <span className="ml-auto" aria-label="重要度">
          {"★".repeat(article.importance)}
          <span className="text-neutral-300 dark:text-neutral-700">{"★".repeat(5 - article.importance)}</span>
        </span>
      </div>
      <h2 className="text-base font-semibold leading-snug mb-2">
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 dark:hover:text-indigo-400">
          {article.title_ja}
        </a>
      </h2>
      <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{article.summary_ja}</p>
    </article>
  );
}
