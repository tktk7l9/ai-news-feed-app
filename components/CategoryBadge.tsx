import Link from "next/link";
import type { Category } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

const STYLES: Record<Category, string> = {
  llm: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  image: "bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
  research: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  product: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  business: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  tool: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  other: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

export function CategoryBadge({ category, link = true }: { category: Category; link?: boolean }) {
  const cls = `inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded ${STYLES[category] ?? STYLES.other}`;
  const label = CATEGORY_LABELS[category] ?? category;
  if (!link) return <span className={cls}>{label}</span>;
  return (
    <Link href={`/category/${category}`} prefetch={false} className={cls}>
      {label}
    </Link>
  );
}
