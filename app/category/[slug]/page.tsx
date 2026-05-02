import { notFound } from "next/navigation";
import Link from "next/link";
import { AiTrivia } from "@/components/AiTrivia";
import { ArticleCard } from "@/components/ArticleCard";
import { ErrorBanner } from "@/components/ErrorBanner";
import { getArticlesByCategory } from "@/lib/queries";
import { pickRandomTrivia } from "@/lib/trivia";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/types";

export const revalidate = 3600;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c }));
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!CATEGORIES.includes(slug as Category)) notFound();
  const cat = slug as Category;
  const { articles, error } = await getArticlesByCategory(cat, 50);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/" className="text-xs text-neutral-500 hover:text-foreground">← トップに戻る</Link>
      <h1 className="text-xl font-semibold mt-4 mb-6">
        カテゴリ: {CATEGORY_LABELS[cat]}
      </h1>
      {error ? (
        <ErrorBanner message={error} />
      ) : articles.length === 0 ? (
        <div>
          <p className="text-sm text-neutral-500 mb-6">
            このカテゴリにはまだ記事がありません。AI に関する雑学をどうぞ。
          </p>
          <AiTrivia initial={pickRandomTrivia()} />
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
