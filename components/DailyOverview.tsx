import { formatJpDate } from "@/lib/date";
import { AudioPlayer } from "./AudioPlayer";

export function DailyOverview({
  date,
  overview,
  articleCount,
  audioUrl,
}: {
  date: string;
  overview: string;
  articleCount: number;
  audioUrl: string | null;
}) {
  return (
    <section className="mb-8">
      <div className="text-xs text-neutral-500 mb-1 flex items-center gap-2">
        <span>
          {formatJpDate(date)} のダイジェスト · {articleCount}件
        </span>
        <AudioPlayer
          type="digest"
          id={date}
          initialUrl={audioUrl}
          label="ダイジェスト"
        />
      </div>
      <p className="text-base leading-relaxed text-neutral-800 dark:text-neutral-200">
        {overview}
      </p>
    </section>
  );
}
