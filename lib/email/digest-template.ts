import type { Article, DailyDigest } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import { formatJpDate } from "@/lib/date";

export function renderDigestEmail(
  digest: DailyDigest,
  articles: Article[],
  unsubscribeUrl: string,
  appUrl: string,
): { subject: string; html: string } {
  const subject = `【AIニュース ${formatJpDate(digest.date)}】${articles[0]?.title_ja ?? ""}`;
  const items = articles
    .map(
      (a) => `
        <div style="margin-bottom:24px;border-left:3px solid #6366f1;padding-left:12px">
          <div style="font-size:11px;color:#6b7280;margin-bottom:4px">
            ${escape(CATEGORY_LABELS[a.category] ?? a.category)} · ${escape(a.source_name)}
          </div>
          <div style="font-size:16px;font-weight:600;margin-bottom:6px">
            <a href="${escape(a.url)}" style="color:#111827;text-decoration:none">${escape(a.title_ja)}</a>
          </div>
          <div style="font-size:14px;color:#374151;line-height:1.6">${escape(a.summary_ja)}</div>
        </div>`,
    )
    .join("");

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px">
  <div style="max-width:640px;margin:0 auto;background:#fff;padding:32px;border-radius:8px">
    <h1 style="margin:0 0 8px;font-size:20px">AIニュース・ダイジェスト</h1>
    <div style="color:#6b7280;font-size:13px;margin-bottom:24px">${escape(formatJpDate(digest.date))}</div>
    <p style="font-size:14px;line-height:1.7;color:#374151;margin-bottom:24px">${escape(digest.overview_ja)}</p>
    ${items}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px" />
    <div style="font-size:12px;color:#9ca3af;text-align:center">
      <a href="${escape(appUrl)}" style="color:#6366f1">ウェブで見る</a> ·
      <a href="${escape(unsubscribeUrl)}" style="color:#9ca3af">配信解除</a>
    </div>
  </div>
</body></html>`;

  return { subject, html };
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
