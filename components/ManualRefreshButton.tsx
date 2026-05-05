"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STORAGE_KEY = "manual-digest-secret";

type Progress =
  | { stage: "loading_sources" }
  | { stage: "fetching_rss"; sources: number }
  | { stage: "saving_raw"; fetched: number; failures: number }
  | { stage: "loading_candidates" }
  | { stage: "filtering"; candidates: number }
  | { stage: "summarizing"; count: number }
  | { stage: "saving_articles"; accepted: number }
  | { stage: "revalidating" };

type StreamEvent =
  | { type: "progress"; progress: Progress }
  | { type: "done"; result: { accepted?: number } }
  | { type: "error"; error: string };

type Status =
  | { kind: "idle" }
  | { kind: "running"; label: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function progressLabel(p: Progress): string {
  switch (p.stage) {
    case "loading_sources":
      return "ソースを読み込み中…";
    case "fetching_rss":
      return `RSSを取得中… (${p.sources}ソース)`;
    case "saving_raw":
      return `生データを保存中… (${p.fetched}件取得 / ${p.failures}件失敗)`;
    case "loading_candidates":
      return "候補を読み込み中…";
    case "filtering":
      return `候補を絞り込み中… (${p.candidates}件)`;
    case "summarizing":
      return `AIで要約生成中… (${p.count}件)`;
    case "saving_articles":
      return `記事を保存中… (${p.accepted}件)`;
    case "revalidating":
      return "ページを再生成中…";
  }
}

export function ManualRefreshButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const run = async () => {
    let secret = sessionStorage.getItem(STORAGE_KEY);
    if (!secret) {
      const entered = window.prompt("CRON_SECRET を入力してください");
      if (!entered) return;
      secret = entered;
    }

    setStatus({ kind: "running", label: "開始中…" });
    try {
      const res = await fetch("/api/manual/digest", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (res.status === 401) {
        sessionStorage.removeItem(STORAGE_KEY);
        setStatus({ kind: "error", message: "認証に失敗しました" });
        return;
      }
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus({
          kind: "error",
          message: body.error ?? `失敗しました (HTTP ${res.status})`,
        });
        return;
      }

      sessionStorage.setItem(STORAGE_KEY, secret);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalEvent: StreamEvent | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl = buffer.indexOf("\n");
        while (nl !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          nl = buffer.indexOf("\n");
          if (!line) continue;
          let event: StreamEvent;
          try {
            event = JSON.parse(line) as StreamEvent;
          } catch {
            continue;
          }
          if (event.type === "progress") {
            setStatus({ kind: "running", label: progressLabel(event.progress) });
          } else {
            finalEvent = event;
          }
        }
      }

      if (finalEvent?.type === "done") {
        setStatus({
          kind: "success",
          message: `${finalEvent.result.accepted ?? 0} 件追加しました`,
        });
        router.refresh();
      } else if (finalEvent?.type === "error") {
        setStatus({ kind: "error", message: finalEvent.error });
      } else {
        setStatus({ kind: "error", message: "応答が途中で終了しました" });
      }
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "ネットワークエラー",
      });
    }
  };

  const running = status.kind === "running";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="text-xs px-3 py-1.5 rounded-full border border-amber-300/70 text-amber-800
                   hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed
                   dark:border-amber-800/70 dark:text-amber-300 dark:hover:bg-amber-950/60"
      >
        {running ? "取得中…" : "手動でニュースを取得"}
      </button>
      {status.kind === "running" && (
        <span className="text-xs text-amber-700 dark:text-amber-300">
          {status.label}
        </span>
      )}
      {status.kind === "success" && (
        <span className="text-xs text-emerald-700 dark:text-emerald-400">
          {status.message}
        </span>
      )}
      {status.kind === "error" && (
        <span className="text-xs text-red-700 dark:text-red-400">
          {status.message}
        </span>
      )}
    </div>
  );
}
