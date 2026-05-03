// Day key for the digest is JST-based so the cron at JST 06:00 / 18:00 stamps the right date.
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function jstDateString(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + JST_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

export function formatJpDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}
