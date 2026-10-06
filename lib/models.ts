// Sourced list of notable AI models shown in the home sidebar.
//
// Rules for editing (keep the list honest):
// - Every entry must come from a vendor page you opened: `sourceUrl` points at it
//   and `verifiedAt` is the day you checked it.
// - `note` paraphrases what the vendor itself says the model is for. No scores,
//   rankings or benchmark numbers: the old list showed synthetic scores with no
//   source, which is exactly what this module replaces.
// - When you re-check the list, bump `MODELS_VERIFIED_AT` and every `verifiedAt`.
//   lib/models.test.ts fails once the list is older than MODELS_STALE_AFTER_DAYS.

export interface ModelEntry {
  vendor: string;
  name: string;
  /** Release or general-availability date (yyyy-mm-dd), as announced by the vendor. */
  releasedAt: string;
  /** Whether the vendor publishes the weights (shown as text, never by colour alone). */
  openWeights: boolean;
  /** One short Japanese line on what the vendor says the model is good at. */
  note: string;
  /** Vendor page the entry was verified against. */
  sourceUrl: string;
  /** Day the entry was last checked against sourceUrl (yyyy-mm-dd). */
  verifiedAt: string;
}

/** The day the whole list was last re-checked; shown in the sidebar header. */
export const MODELS_VERIFIED_AT = "2026-10-06";

/** The list is treated as stale (and the freshness test fails) after this many days. */
export const MODELS_STALE_AFTER_DAYS = 120;

export const MODELS: readonly ModelEntry[] = [
  {
    vendor: "OpenAI",
    name: "GPT-6 Astra",
    releasedAt: "2026-09-03",
    openWeights: false,
    note: "OpenAIの最上位モデル。最も難しい一連の作業を最後までこなす用途向け。",
    sourceUrl: "https://developers.openai.com/api/docs/changelog",
    verifiedAt: "2026-10-06",
  },
  {
    vendor: "OpenAI",
    name: "GPT-6.1 Sol",
    releasedAt: "2026-09-29",
    openWeights: false,
    note: "複雑なコーディングや専門的な業務を、GPT-6 Astraより低いコストでこなす。",
    sourceUrl: "https://developers.openai.com/api/docs/changelog",
    verifiedAt: "2026-10-06",
  },
  {
    vendor: "Anthropic",
    name: "Claude Fable 5.1",
    releasedAt: "2026-09-01",
    openWeights: false,
    note: "高度な推論と、長時間にわたるエージェント型の作業向け。",
    sourceUrl: "https://www.anthropic.com/claude-fable-and-mythos-5-1",
    verifiedAt: "2026-10-06",
  },
  {
    vendor: "Anthropic",
    name: "Claude Opus 5.5",
    releasedAt: "2026-09-22",
    openWeights: false,
    note: "長時間のエージェント型コーディングと知的作業向け。コードベース全体の移行や監査が得意。",
    sourceUrl: "https://www.anthropic.com/claude-opus-5-5",
    verifiedAt: "2026-10-06",
  },
  {
    vendor: "Anthropic",
    name: "Claude Sonnet 5.5",
    releasedAt: "2026-09-28",
    openWeights: false,
    note: "速さと賢さのバランス型。日常のタスク、バグ修正、資料・表の作成が得意。",
    sourceUrl: "https://www.anthropic.com/claude-sonnet-5-5",
    verifiedAt: "2026-10-06",
  },
  {
    vendor: "Google",
    name: "Gemini 4 Argon",
    releasedAt: "2026-09-30",
    openWeights: false,
    note: "ソフトウェア開発・企業の知的業務・サイバー防御向け。審査済みのサイバー防御者から段階的に提供中。",
    sourceUrl: "https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/",
    verifiedAt: "2026-10-06",
  },
  {
    vendor: "Google",
    name: "Gemini 3.8 Flash",
    releasedAt: "2026-09-02",
    openWeights: false,
    note: "Flash系で最も高性能。長時間のソフトウェア開発やエージェント、複雑な業務フロー向け。",
    sourceUrl: "https://ai.google.dev/gemini-api/docs/changelog",
    verifiedAt: "2026-10-06",
  },
  {
    vendor: "SpaceXAI",
    name: "Grok 4.7",
    releasedAt: "2026-09-21",
    openWeights: false,
    note: "SpaceXAI（旧xAI）の最上位。コーディング・エージェント作業・知的作業向け。",
    sourceUrl: "https://docs.x.ai/developers/grok-4-7",
    verifiedAt: "2026-10-06",
  },
  {
    vendor: "Meta",
    name: "Muse Spark 1.3",
    releasedAt: "2026-09-02",
    openWeights: false,
    note: "Metaの最上位。エージェント作業とコーディング向け。重みは現時点で非公開。",
    sourceUrl: "https://research.meta.ai/blog/introducing-muse-spark-1-3",
    verifiedAt: "2026-10-06",
  },
  {
    vendor: "DeepSeek",
    name: "DeepSeek-V4.1-Flash",
    releasedAt: "2026-09-10",
    openWeights: true,
    note: "動かすパラメータを絞ったMoEで、速く効率的。重みはMITライセンスで公開。",
    sourceUrl: "https://api-docs.deepseek.com/news/news260910",
    verifiedAt: "2026-10-06",
  },
  {
    vendor: "Alibaba (Qwen)",
    name: "Qwen3.8-27B",
    releasedAt: "2026-08-14",
    openWeights: true,
    note: "27Bの密モデル。画像・動画の理解、コーディング、エージェント作業。Apache 2.0で公開。",
    sourceUrl: "https://huggingface.co/Qwen/Qwen3.8-27B",
    verifiedAt: "2026-10-06",
  },
  {
    vendor: "Mistral AI",
    name: "Mistral Medium 3.5",
    releasedAt: "2026-05-22",
    openWeights: true,
    note: "128Bの密モデル。指示追従・推論・コーディングを1つの重みで扱う。修正MITライセンスで公開。",
    sourceUrl: "https://mistral.ai/news/vibe-remote-agents-mistral-medium-3-5/",
    verifiedAt: "2026-10-06",
  },
];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses "yyyy-mm-dd" as a UTC date; null for other shapes or days that do not exist. */
export function parseISODate(iso: string): Date | null {
  const m = ISO_DATE.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  const valid = date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
  return valid ? date : null;
}

/** Whole days from `iso` to `now` (Infinity for an invalid date, so it always reads as stale). */
export function daysSince(iso: string, now: Date): number {
  const date = parseISODate(iso);
  if (!date) return Infinity;
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}
