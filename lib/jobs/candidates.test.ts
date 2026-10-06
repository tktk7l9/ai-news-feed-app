import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANDIDATE_POOL_LIMIT,
  GEMINI_BATCH_SIZE,
  PER_SOURCE_CAP,
  SOURCES_PER_BATCH,
  selectCandidates,
  type Candidate,
} from "./candidates.ts";
import { isAIRelated } from "../rss/filter.ts";

type Row = Candidate & { source_name: string };

const T0 = Date.UTC(2026, 9, 6, 0, 0, 0);

/** `count` AI-related rows for one source, one minute apart, newest = index 0. */
function rows(sourceId: string, count: number, weight = 1, opts: { ai?: boolean } = {}): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${sourceId}-${String(i).padStart(4, "0")}`,
    // "ai" is matched as a substring, so the non-AI title must not contain it ("plain" would).
    title: opts.ai === false ? `kitchen recipe ${i}` : `${sourceId} post ${i} about machine learning`,
    raw_content: null,
    published_at: new Date(T0 - i * 60_000).toISOString(),
    source_id: sourceId,
    source_name: sourceId,
    source_weight: weight,
  }));
}

/** What lib/jobs/digest.ts did before: no ORDER BY, LIMIT 120, keyword filter, first 60. */
function legacySelect(poolInDbOrder: Row[]): Row[] {
  return poolInDbOrder.slice(0, 120).filter(isAIRelated).slice(0, 60);
}

const countBySource = (picked: Row[]) =>
  picked.reduce((m, r) => m.set(r.source_id, (m.get(r.source_id) ?? 0) + 1), new Map<string, number>());

// Fixture: one firehose (arXiv-like, 400 items, weight 1), two official blogs (weight 2) and
// fourteen ordinary sources (weight 1) with five items each. The DB returned the firehose first.
const firehose = rows("arxiv", 400);
const official = [...rows("openai", 3, 2), ...rows("deepmind", 2, 2)];
const ordinary = Array.from({ length: 14 }, (_, i) => rows(`blog${i}`, 5)).flat();
const poolFirehoseFirst = [...firehose, ...official, ...ordinary];

test("the old selection let one firehose source starve every other source", () => {
  const picked = legacySelect(poolFirehoseFirst);
  const counts = countBySource(picked);
  assert.equal(picked.length, 60);
  assert.equal(counts.get("arxiv"), 60);
  assert.equal(counts.size, 1, "no other source made it into the Gemini batch");
});

test("the new selection caps each source and lets every source in", () => {
  const picked = selectCandidates(poolFirehoseFirst);
  const counts = countBySource(picked);
  assert.equal(picked.length, GEMINI_BATCH_SIZE, "the Gemini payload size is unchanged");
  assert.equal(counts.get("arxiv"), PER_SOURCE_CAP);
  for (const [source, n] of counts) assert.ok(n <= PER_SOURCE_CAP, `${source} has ${n} > ${PER_SOURCE_CAP}`);
  // 2 official + 14 ordinary + the firehose = 17 sources; all of them are represented.
  assert.equal(counts.size, 17);
  assert.equal(counts.get("openai"), 3);
  assert.equal(counts.get("deepmind"), 2);
  // Weight 2 sources are taken in full before any weight 1 row.
  assert.deepEqual(
    picked.slice(0, 5).map((r) => r.source_weight),
    [2, 2, 2, 2, 2],
  );
});

test("higher-weight sources come first, then newest first, undated last, id as tie-break", () => {
  const undated: Row = { ...rows("blogX", 1)[0], id: "blogX-undated", published_at: null };
  const badDate: Row = { ...rows("blogX", 1)[0], id: "blogX-baddate", published_at: "not a date" };
  const pool = [undated, ...rows("blogX", 2), ...rows("official", 2, 2), badDate];
  const picked = selectCandidates(pool);
  assert.deepEqual(
    picked.map((r) => r.id),
    ["official-0000", "official-0001", "blogX-0000", "blogX-0001", "blogX-baddate", "blogX-undated"],
  );
});

test("the result does not depend on the order the rows came in", () => {
  const shuffled = [...poolFirehoseFirst].sort((a, b) => (hash(a.id) % 97) - (hash(b.id) % 97));
  const expected = selectCandidates(poolFirehoseFirst).map((r) => r.id);
  assert.deepEqual(selectCandidates(shuffled).map((r) => r.id), expected);
  assert.deepEqual(selectCandidates([...poolFirehoseFirst].reverse()).map((r) => r.id), expected);
});

test("rows without an AI keyword are dropped before the caps apply", () => {
  const pool = [...rows("noise", 10, 5, { ai: false }), ...rows("blog", 2)];
  const picked = selectCandidates(pool);
  assert.deepEqual(picked.map((r) => r.source_id), ["blog", "blog"]);
});

test("a smaller pool than the batch is returned whole, within the per-source cap", () => {
  const pool = [...rows("a", 2), ...rows("b", 1)];
  assert.equal(selectCandidates(pool).length, 3);
  assert.equal(selectCandidates(rows("a", 10), { perSourceCap: 2 }).length, 2);
  assert.equal(selectCandidates(pool, { batchSize: 1 }).length, 1);
});

test("the constants derive the per-source cap from the batch size", () => {
  assert.equal(GEMINI_BATCH_SIZE, 60);
  assert.equal(PER_SOURCE_CAP, Math.ceil(GEMINI_BATCH_SIZE / SOURCES_PER_BATCH));
  assert.ok(PER_SOURCE_CAP * SOURCES_PER_BATCH >= GEMINI_BATCH_SIZE);
  // Supabase's PostgREST max-rows; a higher limit would be cut silently.
  assert.ok(CANDIDATE_POOL_LIMIT <= 1000);
  assert.ok(CANDIDATE_POOL_LIMIT > 400, "must hold one day of arXiv cs.AI");
});

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
