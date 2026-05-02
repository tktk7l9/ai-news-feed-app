import Link from "next/link";
import { AiTrivia } from "@/components/AiTrivia";
import { ArticleCard } from "@/components/ArticleCard";
import { DailyOverview } from "@/components/DailyOverview";
import { ErrorBanner } from "@/components/ErrorBanner";
import { ModelSidebar } from "@/components/ModelSidebar";
import { WeeklyStats } from "@/components/WeeklyStats";
import { WeeklyTopArticles } from "@/components/WeeklyTopArticles";
import {
  getLatestDigest,
  getWeeklyCategoryStats,
  getWeeklyTopArticles,
} from "@/lib/queries";
import { pickRandomTrivia } from "@/lib/trivia";

export const revalidate = 3600;

export default async function HomePage() {
  const [latest, weekly, weeklyTopRes] = await Promise.all([
    getLatestDigest(),
    getWeeklyCategoryStats(),
    getWeeklyTopArticles(5),
  ]);

  const { digest, articles, error: digestError } = latest;
  const { stats: weeklyStats, error: weeklyStatsError } = weekly;
  const { articles: weeklyTop, error: weeklyTopError } = weeklyTopRes;

  const errors = [digestError, weeklyStatsError, weeklyTopError].filter(
    (e): e is string => Boolean(e),
  );

  if (digestError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-xl font-semibold mb-4">取得に失敗しました</h1>
        <ErrorBanner message={digestError} />
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-xl font-semibold mb-2">本日のニュースはまだありません</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
          ダイジェストが生成されるまで、AI に関する雑学をどうぞ。
        </p>
        <AiTrivia initial={pickRandomTrivia()} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex gap-8 items-start">
        {/* Main feed */}
        <div className="flex-1 min-w-0">
          {errors.map((msg, i) => (
            <ErrorBanner key={i} message={msg} />
          ))}
          <DailyOverview date={digest.date} overview={digest.overview_ja} articleCount={digest.article_count} />

          {/* New model releases — pinned to top */}
          {articles.some((a) => a.is_model_release) && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="text-[11px] font-bold tracking-[0.18em] text-amber-700 dark:text-amber-500 uppercase">
                  新モデルリリース
                </span>
                <div className="flex-1 h-px bg-amber-300/50 dark:bg-amber-700/40" />
              </div>
              <div className="space-y-4">
                {articles.filter((a) => a.is_model_release).map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            </div>
          )}

          {/* Regular articles */}
          <div className="space-y-4">
            {articles.filter((a) => !a.is_model_release).map((a) => (
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
