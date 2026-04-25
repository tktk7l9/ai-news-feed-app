import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { DailyOverview } from "@/components/DailyOverview";
import { getLatestDigest } from "@/lib/queries";

export const revalidate = 3600;

export default async function HomePage() {
  const { digest, articles } = await getLatestDigest();

  if (!digest) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-xl font-semibold mb-2">準備中です</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          まだダイジェストが生成されていません。日次ジョブの初回実行をお待ちください。
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <DailyOverview date={digest.date} overview={digest.overview_ja} articleCount={digest.article_count} />
      <div className="space-y-4">
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link href="/archive" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          過去のアーカイブを見る →
        </Link>
      </div>
    </div>
  );
}
