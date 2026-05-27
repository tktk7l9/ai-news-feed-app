"use client";

import { PLAYBACK_RATES, usePlayer } from "./PlayerContext";

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function StickyPlayer() {
  const {
    current,
    playing,
    position,
    duration,
    rate,
    volume,
    muted,
    error,
    queueSize,
    queuePosition,
    togglePlay,
    seek,
    skip,
    setRate,
    setVolume,
    toggleMute,
    next,
    prev,
    close,
  } = usePlayer();

  if (!current) return null;

  const pct = duration > 0 ? (position / duration) * 100 : 0;
  const effectiveVolume = muted ? 0 : volume;
  const volPct = effectiveVolume * 100;
  const inQueue = queueSize > 0 && queuePosition !== null;
  const hasPrev = inQueue && queuePosition > 1;
  const hasNext = inQueue && queuePosition < queueSize;

  return (
    <div
      role="region"
      aria-label="音声プレーヤー"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-300/60 dark:border-amber-700/40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.2)]"
    >
      <div className="max-w-6xl mx-auto px-4 pt-2 pb-3 flex flex-col gap-1">
        {/* Top row: meta + controls */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-500 font-bold flex items-center gap-2">
              <span>{current.type === "digest" ? "ダイジェスト" : "記事"}</span>
              {inQueue && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[9px] tabular-nums normal-case tracking-normal">
                  連続 {queuePosition}/{queueSize}
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 truncate">
              {current.title}
            </div>
            {error && (
              <div
                role="alert"
                className="text-[10px] text-red-600 dark:text-red-400 truncate"
              >
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {inQueue && (
              <button
                type="button"
                onClick={prev}
                disabled={!hasPrev}
                aria-label="前のトラック"
                className="w-8 h-8 inline-flex items-center justify-center rounded-full text-neutral-700 dark:text-neutral-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <PrevTrackIcon />
              </button>
            )}
            <button
              type="button"
              onClick={() => skip(-10)}
              aria-label="10秒戻す"
              className="w-9 h-9 inline-flex items-center justify-center rounded-full text-neutral-700 dark:text-neutral-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
            >
              <Skip10BackIcon />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "一時停止" : "再生"}
              className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-amber-700 hover:bg-amber-800 text-white transition-colors"
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              type="button"
              onClick={() => skip(10)}
              aria-label="10秒進める"
              className="w-9 h-9 inline-flex items-center justify-center rounded-full text-neutral-700 dark:text-neutral-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
            >
              <Skip10ForwardIcon />
            </button>
            {inQueue && (
              <button
                type="button"
                onClick={next}
                disabled={!hasNext}
                aria-label="次のトラック"
                className="w-8 h-8 inline-flex items-center justify-center rounded-full text-neutral-700 dark:text-neutral-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <NextTrackIcon />
              </button>
            )}
          </div>

          <div className="inline-flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "ミュート解除" : "ミュート"}
              aria-pressed={muted}
              className="w-8 h-8 inline-flex items-center justify-center rounded-full text-neutral-600 dark:text-neutral-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
            >
              <VolumeIcon volume={effectiveVolume} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={effectiveVolume}
              onChange={(e) => setVolume(Number.parseFloat(e.target.value))}
              aria-label="音量"
              aria-valuetext={`${Math.round(volPct)}%`}
              className="range-amber hidden sm:block w-20 h-1 cursor-pointer rounded-full bg-neutral-300 dark:bg-neutral-700"
              style={{
                background: `linear-gradient(to right, rgb(180 83 9) 0%, rgb(180 83 9) ${volPct}%, rgb(212 212 212) ${volPct}%, rgb(212 212 212) 100%)`,
              }}
            />
          </div>

          <label className="hidden sm:inline-flex items-center gap-1 text-[11px] text-neutral-600 dark:text-neutral-400 shrink-0">
            <span className="sr-only">再生速度</span>
            <select
              value={rate}
              onChange={(e) => setRate(Number.parseFloat(e.target.value))}
              aria-label="再生速度"
              className="text-xs px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer"
            >
              {PLAYBACK_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}x
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={close}
            aria-label="プレーヤーを閉じる"
            className="w-8 h-8 inline-flex items-center justify-center rounded-full text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors shrink-0"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Progress row */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 tabular-nums w-9 text-right">
            {formatTime(position)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={Math.min(position, duration || 0)}
            onChange={(e) => seek(Number.parseFloat(e.target.value))}
            aria-label="再生位置"
            disabled={duration === 0}
            className="range-amber flex-1 h-1 cursor-pointer rounded-full bg-neutral-300 dark:bg-neutral-700 disabled:opacity-50"
            style={{
              background: `linear-gradient(to right, rgb(180 83 9) 0%, rgb(180 83 9) ${pct}%, rgb(212 212 212) ${pct}%, rgb(212 212 212) 100%)`,
            }}
          />
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 tabular-nums w-9">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function Skip10BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9" />
      <polyline points="3 4 3 12 11 12" />
      <text x="12" y="16" fontSize="6" fill="currentColor" stroke="none" textAnchor="middle" fontWeight="700">10</text>
    </svg>
  );
}

function Skip10ForwardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-9-9" />
      <polyline points="21 4 21 12 13 12" />
      <text x="12" y="16" fontSize="6" fill="currentColor" stroke="none" textAnchor="middle" fontWeight="700">10</text>
    </svg>
  );
}

function PrevTrackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 6h2v12H6zM9.5 12l9.5 6V6z" />
    </svg>
  );
}

function NextTrackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 6h2v12h-2zM5 18l9.5-6L5 6z" />
    </svg>
  );
}

function VolumeIcon({ volume }: { volume: number }) {
  if (volume <= 0) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
      {volume > 0.33 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
      {volume > 0.66 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
