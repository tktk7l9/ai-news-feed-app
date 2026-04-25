import { Resend } from "resend";

let cached: Resend | null = null;

export function getResend(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

const FROM = process.env.RESEND_FROM || "AI News Digest <onboarding@resend.dev>";

export async function sendEmail(to: string, subject: string, html: string) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping send", { to, subject });
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, html });
}

export async function notifyAdmin(subject: string, body: string) {
  const admin = process.env.ADMIN_EMAIL;
  if (!admin) return;
  await sendEmail(admin, `[ai-news-feed-app] ${subject}`, `<pre>${escapeHtml(body)}</pre>`);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
