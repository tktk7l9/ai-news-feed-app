"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ReloadButton } from "@/components/ReloadButton";

// Constructive message with a retry and a way out; technical detail stays in the console (SHIG 55, 60, 11).
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  // retry() re-fetches the segment; reset() would only re-render the same failed payload.
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold mb-4">ページを表示できませんでした</h1>
      <div
        role="alert"
        className="rounded-lg border border-rose-300/70 bg-rose-50/80 px-4 py-3
                   text-sm text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200"
      >
        一時的な問題の可能性があります。もう一度試すか、時間をおいて開き直してください。
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ReloadButton onRetry={() => retry()} />
        <Link href="/" className="inline-flex items-center min-h-11 text-sm underline underline-offset-4">
          トップに戻る
        </Link>
      </div>
    </div>
  );
}
