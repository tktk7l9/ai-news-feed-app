import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { DailyOverview } from "@/components/DailyOverview";
import { ErrorBanner } from "@/components/ErrorBanner";
import { getDigest } from "@/lib/queries";

export const revalidate = 3600;

export default async function ArchiveDay({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const { digest, articles, error } = await getDigest(date);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/archive" className="text-xs text-neutral-500 hover:text-foreground">← アーカイブに戻る</Link>
        <h1 className="text-xl font-semibold mt-4 mb-4">取得に失敗しました</h1>
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (!digest) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/archive" className="text-xs text-neutral-500 hover:text-foreground">← アーカイブに戻る</Link>
      <div className="mt-4">
        <DailyOverview
          date={digest.date}
          overview={digest.overview_ja}
          articleCount={digest.article_count}
          audioUrl={digest.audio_url}
        />
      </div>
      <div className="space-y-4">
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </div>
  );
}
