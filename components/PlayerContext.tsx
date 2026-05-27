"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type PlayTarget = {
  type: "article" | "digest";
  id: string;
  title: string;
};

export type QueueItem = PlayTarget & { initialUrl: string | null };

type Resolved = PlayTarget & { url: string };

type State = {
  current: Resolved | null;
  playing: boolean;
  position: number;
  duration: number;
  rate: number;
  volume: number;
  muted: boolean;
  error: string | null;
};

type QueueState = {
  queueSize: number;
  queuePosition: number | null; // 1-based; null when no queue is active
};

type PlayerValue = State &
  QueueState & {
    loadingId: string | null;
    play: (target: PlayTarget, initialUrl: string | null) => Promise<void>;
    playQueue: (items: QueueItem[]) => Promise<void>;
    next: () => void;
    prev: () => void;
    pause: () => void;
    togglePlay: () => void;
    seek: (seconds: number) => void;
    skip: (deltaSeconds: number) => void;
    setRate: (rate: number) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
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
  const queueRef = useRef<QueueItem[]>([]);
  const queueIndexRef = useRef<number>(-1);
  // Holds the latest "advance to next queue item" closure so the audio
  // element's 'ended' listener (attached once) can always call into fresh state.
  const onEndedRef = useRef<() => void>(() => {});

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [queueState, setQueueState] = useState<QueueState>({
    queueSize: 0,
    queuePosition: null,
  });
  const [state, setState] = useState<State>({
    current: null,
    playing: false,
    position: 0,
    duration: 0,
    rate: 1,
    volume: 0.5,
    muted: false,
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
    el.addEventListener("ended", () => {
      setState((s) => ({ ...s, playing: false, position: el.duration || 0 }));
      onEndedRef.current();
    });
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

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    queueIndexRef.current = -1;
    setQueueState({ queueSize: 0, queuePosition: null });
  }, []);

  // Core play: loads and starts the audio without touching queue refs.
  const playCore = useCallback(
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
      audio.volume = state.volume;
      audio.muted = state.muted;
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
    [getAudio, state.current, state.rate, state.volume, state.muted],
  );

  const play = useCallback(
    async (target: PlayTarget, initialUrl: string | null) => {
      clearQueue();
      await playCore(target, initialUrl);
    },
    [clearQueue, playCore],
  );

  const playIndex = useCallback(
    async (i: number) => {
      const item = queueRef.current[i];
      if (!item) return;
      queueIndexRef.current = i;
      setQueueState((q) => ({ ...q, queuePosition: i + 1 }));
      await playCore(
        { type: item.type, id: item.id, title: item.title },
        item.initialUrl,
      );
    },
    [playCore],
  );

  const playQueue = useCallback(
    async (items: QueueItem[]) => {
      if (items.length === 0) return;
      queueRef.current = items;
      queueIndexRef.current = -1;
      setQueueState({ queueSize: items.length, queuePosition: null });
      await playIndex(0);
    },
    [playIndex],
  );

  const next = useCallback(() => {
    const i = queueIndexRef.current + 1;
    if (i < queueRef.current.length) void playIndex(i);
  }, [playIndex]);

  const prev = useCallback(() => {
    const i = queueIndexRef.current - 1;
    if (i >= 0) void playIndex(i);
  }, [playIndex]);

  // Keep the 'ended' auto-advance closure fresh.
  useLayoutEffect(() => {
    onEndedRef.current = () => {
      const i = queueIndexRef.current + 1;
      if (queueRef.current.length > 0 && i < queueRef.current.length) {
        void playIndex(i);
      }
    };
  }, [playIndex]);

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

  const setVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    const audio = audioRef.current;
    if (audio) {
      audio.volume = clamped;
      // Adjusting the slider implicitly unmutes — matches typical media UIs.
      if (clamped > 0) audio.muted = false;
    }
    setState((s) => ({
      ...s,
      volume: clamped,
      muted: clamped > 0 ? false : s.muted,
    }));
  }, []);

  const toggleMute = useCallback(() => {
    setState((s) => {
      const next = !s.muted;
      const audio = audioRef.current;
      if (audio) audio.muted = next;
      return { ...s, muted: next };
    });
  }, []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    clearQueue();
    setState((s) => ({
      current: null,
      playing: false,
      position: 0,
      duration: 0,
      rate: s.rate,
      volume: s.volume,
      muted: s.muted,
      error: null,
    }));
  }, [clearQueue]);

  const isCurrent = useCallback(
    (t: { type: PlayTarget["type"]; id: string }) =>
      !!state.current && targetKey(state.current) === targetKey(t),
    [state.current],
  );

  return (
    <Ctx.Provider
      value={{
        ...state,
        ...queueState,
        loadingId,
        play,
        playQueue,
        next,
        prev,
        pause,
        togglePlay,
        seek,
        skip,
        setRate,
        setVolume,
        toggleMute,
        close,
        isCurrent,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
