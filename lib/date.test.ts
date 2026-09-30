import { test } from "node:test";
import assert from "node:assert/strict";
import { dateParts, formatJpDate, jstDateString } from "./date.ts";

test("jstDateString keys the day by JST, not by the server clock", () => {
  // 2026-09-29T20:00Z is already 2026-09-30 05:00 in JST.
  assert.equal(jstDateString(new Date("2026-09-29T20:00:00Z")), "2026-09-30");
  assert.equal(jstDateString(new Date("2026-09-29T14:59:00Z")), "2026-09-29");
});

test("formatJpDate drops leading zeros", () => {
  assert.equal(formatJpDate("2026-01-05"), "2026年1月5日");
});

test("dateParts keeps the calendar day whatever the process time zone is", () => {
  // 2026-09-30 is a Wednesday. Under TZ=UTC the old +09:00 parsing returned 29 / Tuesday.
  assert.deepEqual(dateParts("2026-09-30"), { year: 2026, month: 9, day: 30, dow: 3 });
  assert.deepEqual(dateParts("2026-10-04"), { year: 2026, month: 10, day: 4, dow: 0 });
  assert.deepEqual(dateParts("2026-10-03"), { year: 2026, month: 10, day: 3, dow: 6 });
});
