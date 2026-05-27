import { formatJpDate } from "@/lib/date";
import type { Article } from "@/lib/types";
import { AudioPlayer } from "./AudioPlayer";
import { PlayAllButton } from "./PlayAllButton";

export function DailyOverview({
  date,
  overview,
  articleCount,
  audioUrl,
  articles,
}: {
  date: string;
  overview: string;
  articleCount: number;
  audioUrl: string | null;
  articles: Article[];
}) {
  return (
    <section className="mb-8">
      <div className="text-xs text-neutral-500 mb-1 flex items-center gap-2 flex-wrap">
        <span>
          {formatJpDate(date)} のダイジェスト · {articleCount}件
        </span>
        <AudioPlayer
          type="digest"
          id={date}
          initialUrl={audioUrl}
          title={`${formatJpDate(date)} のダイジェスト`}
        />
      </div>
      <p className="text-base leading-relaxed text-neutral-800 dark:text-neutral-200 mb-3">
        {overview}
      </p>
      {articles.length > 0 && (
        <PlayAllButton
          digestDate={date}
          digestAudioUrl={audioUrl}
          articles={articles}
        />
      )}
    </section>
  );
}
