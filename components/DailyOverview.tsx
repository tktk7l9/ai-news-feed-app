"use client";

import { formatJpDate } from "@/lib/date";
import type { Article } from "@/lib/types";
import { AudioPlayer } from "./AudioPlayer";
import { PlayAllButton } from "./PlayAllButton";
import { usePlayer } from "./PlayerContext";

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
  const { isCurrent, playing } = usePlayer();
  const isPlayingNow = isCurrent({ type: "digest", id: date });

  return (
    <section
      aria-current={isPlayingNow ? "true" : undefined}
      className={[
        "relative mb-8 transition-all",
        isPlayingNow
          ? "rounded-xl p-3 -m-3 mb-5 ring-2 ring-amber-500 dark:ring-amber-400 bg-amber-50/40 dark:bg-amber-950/20 shadow-lg shadow-amber-300/40 dark:shadow-amber-700/30"
          : "",
      ].join(" ")}
    >
      {isPlayingNow && (
        <span
          aria-hidden="true"
          className="absolute -top-2 -right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold tracking-wide shadow"
        >
          <span
            className={[
              "w-1.5 h-1.5 rounded-full bg-white",
              playing ? "animate-pulse" : "opacity-60",
            ].join(" ")}
          />
          {playing ? "再生中" : "一時停止"}
        </span>
      )}
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
