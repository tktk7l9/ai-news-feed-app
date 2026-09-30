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

// Calendar fields of a YYYY-MM-DD key, independent of the server's time zone.
// Parsing "<date>T00:00:00+09:00" and reading getDate()/getDay() shifts the day back
// by one on a UTC server (Cloudflare Workers), so the archive showed the wrong day.
export function dateParts(isoDate: string): { year: number; month: number; day: number; dow: number } {
  const [y, m, d] = isoDate.split("-").map(Number);
  return { year: y, month: m, day: d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}
