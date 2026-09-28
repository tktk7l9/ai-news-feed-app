import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "ページが見つかりません" };

// Japanese 404 with the likely reason and ways forward (SHIG 11, 55, 60).
export default function NotFound() {
  const linkCls =
    "inline-flex items-center min-h-11 px-4 rounded-lg border border-black/10 dark:border-white/15 text-sm hover:bg-amber-50/70 dark:hover:bg-amber-950/30";
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold mb-3">ページが見つかりません</h1>
      <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 mb-6">
        URL が変わったか、削除された可能性があります。ダイジェストは90日を過ぎると自動で削除されます。
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/" prefetch={false} className={linkCls}>今日のニュースを見る</Link>
        <Link href="/archive" prefetch={false} className={linkCls}>アーカイブから探す</Link>
      </div>
    </div>
  );
}
