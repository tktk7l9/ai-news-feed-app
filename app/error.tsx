"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold mb-4">エラーが発生しました</h1>
      <div
        role="alert"
        className="rounded-lg border border-rose-300/70 bg-rose-50/80 px-4 py-3
                   text-sm text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200"
      >
        <div className="font-semibold mb-0.5">処理に失敗しました</div>
        <div className="break-words whitespace-pre-wrap">{error.message || "不明なエラー"}</div>
        {error.digest && (
          <div className="mt-2 text-xs opacity-70">digest: {error.digest}</div>
        )}
      </div>
      <button
        onClick={() => reset()}
        className="mt-4 inline-flex items-center rounded-md border border-neutral-300 px-3 py-1.5 text-sm
                   hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        もう一度試す
      </button>
    </div>
  );
}
