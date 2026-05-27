"use client";

import type { Article } from "@/lib/types";
import { formatJpDate } from "@/lib/date";
import { usePlayer, type QueueItem } from "./PlayerContext";

type Props = {
  digestDate: string;
  digestAudioUrl: string | null;
  articles: Article[];
};

export function PlayAllButton({ digestDate, digestAudioUrl, articles }: Props) {
  const { playQueue, queueSize, queuePosition, loadingId } = usePlayer();
  const queueActive = queueSize > 0;
  const loading = loadingId !== null;

  const onClick = () => {
    const items: QueueItem[] = [
      {
        type: "digest",
        id: digestDate,
        title: `${formatJpDate(digestDate)} のダイジェスト`,
        initialUrl: digestAudioUrl,
      },
      ...articles.map<QueueItem>((a) => ({
        type: "article",
        id: a.id,
        title: a.title_ja?.trim() || `${a.source_name} の記事`,
        initialUrl: a.audio_url,
      })),
    ];
    void playQueue(items);
  };

  const label = queueActive
    ? `連続再生中 ${queuePosition ?? 1}/${queueSize}`
    : `ダイジェスト + ${articles.length}記事を連続再生`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      <PlayListIcon />
      <span>{label}</span>
    </button>
  );
}

function PlayListIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="14" y2="6" />
      <line x1="3" y1="12" x2="14" y2="12" />
      <line x1="3" y1="18" x2="10" y2="18" />
      <polygon points="17 16 22 19 17 22" fill="currentColor" stroke="none" />
    </svg>
  );
}
