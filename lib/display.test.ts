import { test } from "node:test";
import assert from "node:assert/strict";
import {
  digestTitle,
  groupByDigestDate,
  importanceLabel,
  importanceStars,
} from "./display.ts";

test("importanceStars uses filled and hollow shapes, not colour alone", () => {
  assert.equal(importanceStars(4), "★★★★☆");
  assert.equal(importanceStars(5), "★★★★★");
  assert.equal(importanceStars(1), "★☆☆☆☆");
});

test("importanceStars clamps out-of-range and fractional values", () => {
  assert.equal(importanceStars(0), "☆☆☆☆☆");
  assert.equal(importanceStars(9), "★★★★★");
  assert.equal(importanceStars(3.6), "★★★★☆");
  assert.equal(importanceStars(Number.NaN), "☆☆☆☆☆");
});

test("importanceLabel gives screen readers the value and the scale", () => {
  assert.equal(importanceLabel(4), "重要度 4（5段階）");
  assert.equal(importanceLabel(12), "重要度 5（5段階）");
});

test("digestTitle names the day in Japanese", () => {
  assert.equal(digestTitle("2026-09-20"), "2026年9月20日のダイジェスト");
  assert.equal(digestTitle("2026-01-05"), "2026年1月5日のダイジェスト");
});

test("groupByDigestDate keeps input order and groups consecutive days", () => {
  const rows = [
    { id: "a", digest_date: "2026-09-28" },
    { id: "b", digest_date: "2026-09-28" },
    { id: "c", digest_date: "2026-09-27" },
    { id: "d", digest_date: "2026-09-20" },
  ];
  const groups = groupByDigestDate(rows);
  assert.deepEqual(
    groups.map((g) => [g.date, g.items.map((i) => i.id)]),
    [
      ["2026-09-28", ["a", "b"]],
      ["2026-09-27", ["c"]],
      ["2026-09-20", ["d"]],
    ],
  );
});

test("groupByDigestDate returns an empty list for no rows", () => {
  assert.deepEqual(groupByDigestDate([]), []);
});
