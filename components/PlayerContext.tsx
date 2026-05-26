"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type PlayTarget = {
  type: "article" | "digest";
  id: string;
  title: string;
};

type Resolved = PlayTarget & { url: string };

type State = {
  current: Resolved | null;
  playing: boolean;
  position: number;
  duration: number;
  rate: number;
  error: string | null;
};

type PlayerValue = State & {
  loadingId: string | null;
  play: (target: PlayTarget, initialUrl: string | null) => Promise<void>;
  pause: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  skip: (deltaSeconds: number) => void;
  setRate: (rate: number) => void;
  close: () => void;
  isCurrent: (target: { type: PlayTarget["type"]; id: string }) => boolean;
};

const Ctx = createContext<PlayerValue | null>(null);

export function usePlayer(): PlayerValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlayer requires <PlayerProvider>");
  return ctx;
}

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

const targetKey = (t: { type: string; id: string }) => `${t.type}:${t.id}`;

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [state, setState] = useState<State>({
    current: null,
    playing: false,
    position: 0,
    duration: 0,
    rate: 1,
    error: null,
  });

  const getAudio = useCallback((): HTMLAudioElement => {
    if (audioRef.current) return audioRef.current;
    const el = new Audio();
    el.preload = "metadata";
    el.addEventListener("play", () =>
      setState((s) => ({ ...s, playing: true, error: null })),
    );
    el.addEventListener("pause", () =>
      setState((s) => ({ ...s, playing: false })),
    );
    el.addEventListener("ended", () =>
      setState((s) => ({ ...s, playing: false, position: el.duration || 0 })),
    );
    el.addEventListener("timeupdate", () =>
      setState((s) => ({ ...s, position: el.currentTime })),
    );
    el.addEventListener("loadedmetadata", () =>
      setState((s) => ({ ...s, duration: el.duration })),
    );
    el.addEventListener("error", () =>
      setState((s) => ({ ...s, playing: false, error: "再生に失敗しました" })),
    );
    audioRef.current = el;
    return el;
  }, []);

  const play = useCallback(
    async (target: PlayTarget, initialUrl: string | null) => {
      const audio = getAudio();
      const key = targetKey(target);

      // Same target → just resume
      if (state.current && targetKey(state.current) === key) {
        await audio.play().catch(() =>
          setState((s) => ({ ...s, error: "再生に失敗しました" })),
        );
        return;
      }

      // Resolve URL
      let url = initialUrl;
      if (!url) {
        setLoadingId(key);
        setState((s) => ({ ...s, error: null }));
        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: target.type, id: target.id }),
          });
          const data = (await res.json()) as { url?: string; error?: string };
          if (!res.ok || !data.url) {
            throw new Error(data.error ?? `HTTP ${res.status}`);
          }
          url = data.url;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "音声の取得に失敗しました";
          setLoadingId(null);
          setState((s) => ({ ...s, error: msg }));
          return;
        }
        setLoadingId(null);
      }

      audio.pause();
      audio.src = url;
      audio.playbackRate = state.rate;
      setState((s) => ({
        ...s,
        current: { ...target, url: url as string },
        position: 0,
        duration: 0,
        error: null,
      }));
      await audio.play().catch((e) =>
        setState((s) => ({
          ...s,
          error: e instanceof Error ? e.message : "再生に失敗しました",
        })),
      );
    },
    [getAudio, state.current, state.rate],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !state.current) return;
    if (state.playing) audio.pause();
    else void audio.play();
  }, [state.playing, state.current]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = audio.duration || 0;
    audio.currentTime = Math.max(0, Math.min(dur, seconds));
  }, []);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = audio.duration || 0;
    audio.currentTime = Math.max(0, Math.min(dur, audio.currentTime + delta));
  }, []);

  const setRate = useCallback((rate: number) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
    setState((s) => ({ ...s, rate }));
  }, []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setState((s) => ({
      current: null,
      playing: false,
      position: 0,
      duration: 0,
      rate: s.rate,
      error: null,
    }));
  }, []);

  const isCurrent = useCallback(
    (t: { type: PlayTarget["type"]; id: string }) =>
      !!state.current && targetKey(state.current) === targetKey(t),
    [state.current],
  );

  return (
    <Ctx.Provider
      value={{
        ...state,
        loadingId,
        play,
        pause,
        togglePlay,
        seek,
        skip,
        setRate,
        close,
        isCurrent,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
