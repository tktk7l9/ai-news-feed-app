// Pure display helpers shared by server and client components.
// Imports use explicit .ts extensions so `node --test` can run them without a bundler.
import { formatJpDate } from "./date.ts";

const MAX_IMPORTANCE = 5;

function clampImportance(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(MAX_IMPORTANCE, Math.round(n)));
}

// Filled vs hollow star so the value survives without colour (SHIG 96).
export function importanceStars(n: number): string {
  const v = clampImportance(n);
  return "★".repeat(v) + "☆".repeat(MAX_IMPORTANCE - v);
}

// Text alternative for the stars (SHIG 94).
export function importanceLabel(n: number): string {
  return `重要度 ${clampImportance(n)}（${MAX_IMPORTANCE}段階）`;
}

export function digestTitle(isoDate: string): string {
  return `${formatJpDate(isoDate)}のダイジェスト`;
}

// Groups rows that are already sorted by digest_date, keeping their order.
export function groupByDigestDate<T extends { digest_date: string }>(
  rows: T[],
): { date: string; items: T[] }[] {
  const groups: { date: string; items: T[] }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.date === row.digest_date) last.items.push(row);
    else groups.push({ date: row.digest_date, items: [row] });
  }
  return groups;
}
