import Link from "next/link";
import { getArchiveDates } from "@/lib/queries";
import { formatJpDate } from "@/lib/date";

export const revalidate = 3600;

export default async function ArchiveIndex() {
  const dates = await getArchiveDates(120);
  const grouped = new Map<string, typeof dates>();
  for (const d of dates) {
    const ym = d.date.slice(0, 7);
    if (!grouped.has(ym)) grouped.set(ym, []);
    grouped.get(ym)!.push(d);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold mb-6">アーカイブ</h1>
      {dates.length === 0 ? (
        <p className="text-sm text-neutral-500">まだ過去のダイジェストがありません。</p>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([ym, items]) => (
            <section key={ym}>
              <h2 className="text-sm font-semibold text-neutral-500 mb-3">
                {ym.slice(0, 4)}年{Number(ym.slice(5, 7))}月
              </h2>
              <ul className="space-y-1">
                {items.map((d) => (
                  <li key={d.date} className="flex justify-between border-b border-black/5 dark:border-white/10 py-2">
                    <Link href={`/archive/${d.date}`} className="text-sm hover:text-indigo-600 dark:hover:text-indigo-400">
                      {formatJpDate(d.date)}
                    </Link>
                    <span className="text-xs text-neutral-500">{d.article_count} 件</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
