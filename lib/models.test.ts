import { test } from "node:test";
import assert from "node:assert/strict";
import { MODELS, MODELS_STALE_AFTER_DAYS, MODELS_VERIFIED_AT, daysSince, parseISODate } from "./models.ts";

// Fixed clock for the freshness check. Bump it when you re-verify the list (and the
// verifiedAt dates with it); once this date is more than MODELS_STALE_AFTER_DAYS past
// the oldest verifiedAt, the test fails and the list has to be re-checked.
// It must never run ahead of the real date, which the next test enforces.
const FRESHNESS_CLOCK = new Date("2026-10-06T00:00:00Z");

test("the freshness clock is not in the future", () => {
  assert.ok(FRESHNESS_CLOCK.getTime() <= Date.now());
});

test("every entry has the required fields, an https vendor source and valid dates", () => {
  assert.ok(MODELS.length >= 8);
  for (const m of MODELS) {
    const label = `${m.vendor} / ${m.name}`;
    assert.ok(m.vendor.trim(), `${label}: vendor`);
    assert.ok(m.name.trim(), `${label}: name`);
    assert.ok(m.note.trim(), `${label}: note`);
    assert.equal(new URL(m.sourceUrl).protocol, "https:", `${label}: sourceUrl must be https`);
    const released = parseISODate(m.releasedAt);
    assert.ok(released, `${label}: releasedAt must be yyyy-mm-dd`);
    assert.ok(released.getTime() <= Date.now(), `${label}: releasedAt is in the future`);
    const verified = parseISODate(m.verifiedAt);
    assert.ok(verified, `${label}: verifiedAt must be yyyy-mm-dd`);
    assert.ok(verified.getTime() <= Date.now(), `${label}: verifiedAt is in the future`);
    assert.ok(verified.getTime() >= released.getTime(), `${label}: verified before release`);
  }
});

test("notes carry no scores, rankings or benchmark numbers", () => {
  for (const m of MODELS) {
    assert.doesNotMatch(m.note, /スコア|ランキング|\d+\s*(点|位)|%|％|benchmark|ベンチマーク/i, `${m.vendor} / ${m.name}`);
  }
});

test("vendor + name is unique", () => {
  const keys = MODELS.map((m) => `${m.vendor}\u0000${m.name}`);
  assert.equal(new Set(keys).size, keys.length);
});

test("covers OpenAI, Anthropic, Google, SpaceXAI and at least three open-weight vendors", () => {
  const vendors = new Set(MODELS.map((m) => m.vendor));
  for (const v of ["OpenAI", "Anthropic", "Google", "SpaceXAI"]) assert.ok(vendors.has(v), v);
  const openVendors = new Set(MODELS.filter((m) => m.openWeights).map((m) => m.vendor));
  assert.ok(openVendors.size >= 3);
});

test("the header date matches the newest verifiedAt", () => {
  const newest = MODELS.map((m) => m.verifiedAt).sort().at(-1);
  assert.equal(MODELS_VERIFIED_AT, newest);
});

test(`the list was verified within the last ${MODELS_STALE_AFTER_DAYS} days of the freshness clock`, () => {
  for (const m of MODELS) {
    const age = daysSince(m.verifiedAt, FRESHNESS_CLOCK);
    assert.ok(
      age <= MODELS_STALE_AFTER_DAYS,
      `${m.vendor} / ${m.name} was verified ${age} days before ${FRESHNESS_CLOCK.toISOString().slice(0, 10)}; re-check it`,
    );
  }
});

test("parseISODate rejects other shapes and days that do not exist", () => {
  assert.equal(parseISODate("2026-10"), null);
  assert.equal(parseISODate("2026-02-30"), null);
  assert.equal(parseISODate("2026/10/06"), null);
  assert.equal(parseISODate("2026-10-06")?.toISOString(), "2026-10-06T00:00:00.000Z");
});

test("daysSince counts whole days and treats an invalid date as infinitely old", () => {
  assert.equal(daysSince("2026-10-01", new Date("2026-10-06T12:00:00Z")), 5);
  assert.equal(daysSince("not-a-date", new Date()), Infinity);
});

test("the staleness rule trips once a date is past the limit", () => {
  const limit = new Date(Date.UTC(2026, 9, 6) + MODELS_STALE_AFTER_DAYS * 86_400_000);
  assert.ok(daysSince("2026-10-06", limit) <= MODELS_STALE_AFTER_DAYS);
  const pastLimit = new Date(limit.getTime() + 86_400_000);
  assert.ok(daysSince("2026-10-06", pastLimit) > MODELS_STALE_AFTER_DAYS);
});
