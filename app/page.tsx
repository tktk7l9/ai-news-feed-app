import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { DailyOverview } from "@/components/DailyOverview";
import { ModelSidebar } from "@/components/ModelSidebar";
import { WeeklyStats } from "@/components/WeeklyStats";
import { WeeklyTopArticles } from "@/components/WeeklyTopArticles";
import {
  getLatestDigest,
  getWeeklyCategoryStats,
  getWeeklyTopArticles,
} from "@/lib/queries";

export const revalidate = 3600;

export default async function HomePage() {
  const [{ digest, articles }, weeklyStats, weeklyTop] = await Promise.all([
    getLatestDigest(),
    getWeeklyCategoryStats(),
    getWeeklyTopArticles(5),
  ]);

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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex gap-8 items-start">
        {/* Main feed */}
        <div className="flex-1 min-w-0">
          <DailyOverview date={digest.date} overview={digest.overview_ja} articleCount={digest.article_count} />
          <div className="space-y-4">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/archive" className="text-sm text-amber-700 hover:underline dark:text-amber-500">
              過去のアーカイブを見る →
            </Link>
          </div>
        </div>

        {/* Sidebar — xl and wider */}
        <aside className="hidden xl:flex flex-col gap-4 w-64 shrink-0 sticky top-24">
          <WeeklyTopArticles articles={weeklyTop} />
          <WeeklyStats stats={weeklyStats} />
          <ModelSidebar />
        </aside>
      </div>
    </div>
  );
}
