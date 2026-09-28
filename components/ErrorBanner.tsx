import Link from "next/link";
import { ReloadButton } from "./ReloadButton";

// Constructive error: what happened, what to do, and a way out (SHIG 55, 60).
export function ErrorBanner({
  title,
  message,
  alternative = { href: "/archive", label: "過去のアーカイブを見る" },
}: {
  title?: string;
  message: string;
  alternative?: { href: string; label: string } | null;
}) {
  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border border-rose-300/70 bg-rose-50/80 px-4 py-3
                 text-sm text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200"
    >
      <div className="font-semibold mb-0.5">{title ?? "読み込みに失敗しました"}</div>
      <div className="break-words whitespace-pre-wrap">{message}</div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ReloadButton />
        {alternative && (
          <Link
            href={alternative.href}
            prefetch={false}
            className="inline-flex items-center min-h-11 underline underline-offset-4"
          >
            {alternative.label}
          </Link>
        )}
      </div>
    </div>
  );
}
