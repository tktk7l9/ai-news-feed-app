import { formatJpDate } from "@/lib/date";
import { MODELS, MODELS_VERIFIED_AT, type ModelEntry } from "@/lib/models";
import { ExternalMark } from "./ExternalMark";

// Two groups named in text, so the split does not depend on colour (SHIG 96).
const GROUPS: { label: string; pick: (m: ModelEntry) => boolean }[] = [
  { label: "各社の主力モデル", pick: (m) => !m.openWeights },
  { label: "オープンウェイト（重みを公開）", pick: (m) => m.openWeights },
];

// Sourced, dated list of notable models. No scores or rankings: each line is what the
// vendor says the model is for, with a link to the vendor page it came from (SHIG 1).
export function ModelSidebar() {
  const verifiedLabel = formatJpDate(MODELS_VERIFIED_AT);

  return (
    <section
      aria-labelledby="model-sidebar-heading"
      className="rounded-2xl overflow-hidden border border-black/6 dark:border-white/8 bg-white/70 dark:bg-black/40 backdrop-blur-md"
    >
      <div className="px-4 pt-4 pb-3 border-b border-black/6 dark:border-white/8">
        <h2
          id="model-sidebar-heading"
          className="text-xs font-semibold tracking-widest text-neutral-600 dark:text-neutral-400 uppercase"
        >
          主要モデル（{verifiedLabel}時点）
        </h2>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
          各社の公式発表をもとに作成。名前から公式ページを開けます。
        </p>
      </div>

      <div className="divide-y divide-black/4 dark:divide-white/5">
        {GROUPS.map(({ label, pick }) => (
          <div key={label} className="px-4 py-3">
            <h3 className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">{label}</h3>
            <ul className="space-y-2.5">
              {MODELS.filter(pick).map((m) => (
                <li key={`${m.vendor}/${m.name}`}>
                  <a
                    href={m.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-tight underline-offset-2 hover:underline"
                  >
                    {m.name}
                    <ExternalMark />
                  </a>
                  <div className="flex items-baseline gap-2 mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                    <span>{m.vendor}</span>
                    <span aria-hidden="true">・</span>
                    <time dateTime={m.releasedAt} className="tabular-nums">
                      {formatJpDate(m.releasedAt)}
                    </time>
                  </div>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-0.5 leading-relaxed">{m.note}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-black/4 dark:border-white/5">
        <p className="text-xs text-neutral-700 dark:text-neutral-400">日付は各社の発表日・一般提供日です。</p>
      </div>
    </section>
  );
}
