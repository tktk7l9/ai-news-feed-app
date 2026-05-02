export function ErrorBanner({ title, message }: { title?: string; message: string }) {
  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-rose-300/70 bg-rose-50/80 px-4 py-3
                 text-sm text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200"
    >
      <div className="font-semibold mb-0.5">{title ?? "エラーが発生しました"}</div>
      <div className="break-words whitespace-pre-wrap">{message}</div>
    </div>
  );
}
