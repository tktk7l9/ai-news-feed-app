"use client";

import { usePlayer } from "./PlayerContext";

type Props = {
  type: "article" | "digest";
  id: string;
  initialUrl: string | null;
  title: string;
};

export function AudioPlayer({ type, id, initialUrl, title }: Props) {
  const { play, pause, playing, current, loadingId, error, isCurrent } =
    usePlayer();

  const targetKey = `${type}:${id}`;
  const isMine = isCurrent({ type, id });
  const loading = loadingId === targetKey;
  const isPlayingMine = isMine && playing;
  const isLoadedMine = isMine && current !== null;
  const hasError = isMine && Boolean(error);

  const onClick = () => {
    if (isPlayingMine) {
      pause();
      return;
    }
    void play({ type, id, title }, initialUrl);
  };

  const label = type === "digest" ? "ダイジェスト" : "この記事";
  const ariaLabel = isPlayingMine
    ? "一時停止"
    : isLoadedMine
      ? `${label}を再開`
      : `${label}を再生`;

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        aria-label={ariaLabel}
        title={hasError ? (error ?? ariaLabel) : ariaLabel}
        className={[
          "inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors disabled:cursor-wait disabled:opacity-60",
          hasError
            ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            : isLoadedMine
              ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30"
              : "text-neutral-500 dark:text-neutral-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30",
        ].join(" ")}
      >
        {loading ? (
          <SpinnerIcon />
        ) : isPlayingMine ? (
          <PauseIcon />
        ) : (
          <PlayIcon />
        )}
      </button>
      {loading && (
        <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
          音声生成中...
        </span>
      )}
    </span>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="animate-spin"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
    </svg>
  );
}
