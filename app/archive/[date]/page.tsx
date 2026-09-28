import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { BackLink } from "@/components/BackLink";
import { DailyOverview } from "@/components/DailyOverview";
import { ErrorBanner } from "@/components/ErrorBanner";
import { formatJpDate } from "@/lib/date";
import { digestTitle } from "@/lib/display";
import { getAdjacentDigestDates, getDigest } from "@/lib/queries";

export const revalidate = 3600;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Shared by generateMetadata and the page so the digest is fetched once per request.
const loadDigest = cache(getDigest);

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  if (!DATE_RE.test(date)) return {};
  const { digest, error } = await loadDigest(date);
  // A missing day gets the not-found title instead of naming a digest that is not there.
  return digest || error ? { title: digestTitle(date) } : { title: "ページが見つかりません" };
}

// Older day on the left, newer on the right, same order at top and bottom (SHIG 81, 41, 73).
function DayPager({ prev, next }: { prev: string | null; next: string | null }) {
  const cls =
    "inline-flex items-center min-h-11 px-3 rounded-lg text-sm text-amber-800 hover:bg-amber-50/70 dark:text-amber-400 dark:hover:bg-amber-950/30";
  return (
    <nav aria-label="前後の日" className="flex items-center justify-between gap-2">
      {prev ? (
        <Link href={`/archive/${prev}`} prefetch={false} className={cls} rel="prev">
          <span aria-hidden="true" className="mr-1">←</span>前の日（{formatJpDate(prev)}）
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/archive/${next}`} prefetch={false} className={cls} rel="next">
          次の日（{formatJpDate(next)}）<span aria-hidden="true" className="ml-1">→</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export default async function ArchiveDay({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();

  const [{ digest, articles, error }, adjacent] = await Promise.all([
    loadDigest(date),
    getAdjacentDigestDates(date),
  ]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <BackLink href="/archive">アーカイブに戻る</BackLink>
        <h1 className="text-xl font-semibold mt-4 mb-4">{digestTitle(date)}</h1>
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (!digest) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <BackLink href="/archive">アーカイブに戻る</BackLink>
      <div className="mt-2 mb-4">
        <DayPager prev={adjacent.prev} next={adjacent.next} />
      </div>
      <DailyOverview
        date={digest.date}
        overview={digest.overview_ja}
        articleCount={digest.article_count}
      />
      <div className="space-y-4">
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
      <div className="mt-8">
        <DayPager prev={adjacent.prev} next={adjacent.next} />
      </div>
    </div>
  );
}
