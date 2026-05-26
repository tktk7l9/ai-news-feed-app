"use client";

import { useRef, useState } from "react";

type Props = {
  type: "article" | "digest";
  id: string;
  initialUrl: string | null;
  label?: string;
};

export function AudioPlayer({ type, id, initialUrl, label = "読み上げ" }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ensureAudioEl = (src: string): HTMLAudioElement => {
    if (audioRef.current) {
      if (audioRef.current.src !== src) audioRef.current.src = src;
      return audioRef.current;
    }
    const el = new Audio(src);
    el.onplay = () => setPlaying(true);
    el.onpause = () => setPlaying(false);
    el.onended = () => setPlaying(false);
    el.onerror = () => {
      setPlaying(false);
      setError("再生に失敗しました");
    };
    audioRef.current = el;
    return el;
  };

  const toggle = async () => {
    setError(null);

    if (playing) {
      audioRef.current?.pause();
      return;
    }

    let playUrl = url;
    if (!playUrl) {
      setLoading(true);
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, id }),
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        playUrl = data.url;
        setUrl(playUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "音声の取得に失敗しました");
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    const el = ensureAudioEl(playUrl);
    void el.play().catch((e) => {
      setError(e instanceof Error ? e.message : "再生に失敗しました");
      setPlaying(false);
    });
  };

  const ariaLabel = playing ? "一時停止" : `${label}を再生`;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-label={ariaLabel}
      title={error ?? ariaLabel}
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors disabled:cursor-wait disabled:opacity-60"
    >
      {loading ? <SpinnerIcon /> : playing ? <PauseIcon /> : <PlayIcon />}
    </button>
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
