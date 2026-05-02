"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STORAGE_KEY = "manual-digest-secret";

type Status =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

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

    setStatus({ kind: "running" });
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
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setStatus({
          kind: "error",
          message: body.error ?? `失敗しました (HTTP ${res.status})`,
        });
        return;
      }
      const body = (await res.json()) as { accepted?: number };
      sessionStorage.setItem(STORAGE_KEY, secret);
      setStatus({
        kind: "success",
        message: `${body.accepted ?? 0} 件追加しました`,
      });
      router.refresh();
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
