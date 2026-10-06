// Picks which fresh raw_articles go to Gemini.
//
// The pool is read from the database newest-first (bounded by CANDIDATE_POOL_LIMIT) and
// narrowed here, in memory, so the choice is deterministic and fair across sources. Before
// this module the query had no ORDER BY and a limit of 120, so with arXiv cs.AI alone posting
// ~400 items a day the 120 rows were effectively arbitrary and the other sources rarely got in.
import { isAIRelated } from "../rss/filter.ts";

/** Articles sent to Gemini in one run. Unchanged by the per-source cap (same payload size). */
export const GEMINI_BATCH_SIZE = 60;

/** How many sources one batch should have room for; this is what sets the per-source cap. */
export const SOURCES_PER_BATCH = 15;

/** At most this many items from any one source enter the batch (60 / 15 = 4). */
export const PER_SOURCE_CAP = Math.ceil(GEMINI_BATCH_SIZE / SOURCES_PER_BATCH);

/**
 * Rows read from raw_articles for one run. Supabase's PostgREST max-rows is 1000, so a higher
 * value would be cut silently. The query orders by published_at desc, so if a day ever has more
 * unprocessed rows than this, only the oldest are left out.
 */
export const CANDIDATE_POOL_LIMIT = 1000;

export type Candidate = {
  id: string;
  title: string;
  raw_content: string | null;
  published_at: string | null;
  source_id: string;
  source_weight: number;
};

export type SelectOptions = {
  batchSize?: number;
  perSourceCap?: number;
};

/**
 * Keyword filter, then an order of source weight desc / published_at desc (undated last) /
 * id asc, then at most `perSourceCap` items per source, then the first `batchSize`.
 * Pure and total: the same pool always gives the same batch, whatever order the rows came in.
 */
export function selectCandidates<T extends Candidate>(
  pool: T[],
  { batchSize = GEMINI_BATCH_SIZE, perSourceCap = PER_SOURCE_CAP }: SelectOptions = {},
): T[] {
  const ordered = pool.filter(isAIRelated).sort(compareCandidates);
  const perSource = new Map<string, number>();
  const picked: T[] = [];
  for (const row of ordered) {
    if (picked.length >= batchSize) break;
    const used = perSource.get(row.source_id) ?? 0;
    if (used >= perSourceCap) continue;
    perSource.set(row.source_id, used + 1);
    picked.push(row);
  }
  return picked;
}

function compareCandidates(a: Candidate, b: Candidate): number {
  if (a.source_weight !== b.source_weight) return b.source_weight - a.source_weight;
  const byDate = comparePublishedDesc(a.published_at, b.published_at);
  if (byDate !== 0) return byDate;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Newest first; rows without a date go last. */
function comparePublishedDesc(a: string | null, b: string | null): number {
  const ta = toTime(a);
  const tb = toTime(b);
  if (ta === tb) return 0;
  if (ta === null) return 1;
  if (tb === null) return -1;
  return tb - ta;
}

function toTime(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}
