import { notFound } from "next/navigation";
import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { getArticlesByCategory } from "@/lib/queries";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/types";

export const revalidate = 3600;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c }));
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!CATEGORIES.includes(slug as Category)) notFound();
  const cat = slug as Category;
  const articles = await getArticlesByCategory(cat, 50);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/" className="text-xs text-neutral-500 hover:text-foreground">← トップに戻る</Link>
      <h1 className="text-xl font-semibold mt-4 mb-6">
        カテゴリ: {CATEGORY_LABELS[cat]}
      </h1>
      {articles.length === 0 ? (
        <p className="text-sm text-neutral-500">該当する記事がまだありません。</p>
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
