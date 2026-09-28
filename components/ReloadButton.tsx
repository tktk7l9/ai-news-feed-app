"use client";

export function ReloadButton({ onRetry }: { onRetry?: () => void }) {
  return (
    <button
      type="button"
      onClick={() => (onRetry ? onRetry() : window.location.reload())}
      className="inline-flex items-center min-h-11 rounded-md border border-rose-300 bg-white/70 px-4 text-sm font-medium text-rose-900
                 hover:bg-rose-100 dark:border-rose-800 dark:bg-transparent dark:text-rose-100 dark:hover:bg-rose-900/40"
    >
      再読み込み
    </button>
  );
}
