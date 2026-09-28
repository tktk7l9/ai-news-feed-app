import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiTrivia } from "@/components/AiTrivia";
import { ArticleCard } from "@/components/ArticleCard";
import { BackLink } from "@/components/BackLink";
import { ErrorBanner } from "@/components/ErrorBanner";
import { formatJpDate } from "@/lib/date";
import { groupByDigestDate } from "@/lib/display";
import { getArticlesByCategory } from "@/lib/queries";
import { pickRandomTrivia } from "@/lib/trivia";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/types";

export const revalidate = 3600;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return CATEGORIES.includes(slug as Category) ? { title: CATEGORY_LABELS[slug as Category] } : {};
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!CATEGORIES.includes(slug as Category)) notFound();
  const cat = slug as Category;
  const { articles, error } = await getArticlesByCategory(cat, 50);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <BackLink href="/">トップに戻る</BackLink>
      <h1 className="text-xl font-semibold mt-4 mb-6">
        カテゴリ: {CATEGORY_LABELS[cat]}
      </h1>
      {error ? (
        <ErrorBanner message={error} />
      ) : articles.length === 0 ? (
        <div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            このカテゴリにはまだ記事がありません。AI に関する雑学をどうぞ。
          </p>
          <AiTrivia initial={pickRandomTrivia()} />
        </div>
      ) : (
        // Articles span many days, so group them under the day they were published (SHIG 28, 12).
        <div className="space-y-8">
          {groupByDigestDate(articles).map(({ date, items }) => (
            <section key={date} aria-labelledby={`day-${date}`}>
              <div className="flex items-center gap-4 mb-3">
                <h2 id={`day-${date}`} className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 shrink-0">
                  {formatJpDate(date)}
                </h2>
                <div className="flex-1 h-px bg-black/6 dark:bg-white/6" />
              </div>
              <div className="space-y-4">
                {items.map((a) => (
                  <ArticleCard key={a.id} article={a} headingLevel={3} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
