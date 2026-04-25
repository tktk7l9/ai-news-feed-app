import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { getServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";

async function subscribe(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/subscribe?error=invalid");
  }

  const sb = getServiceClient();
  const confirmToken = randomBytes(24).toString("hex");
  const unsubToken = randomBytes(24).toString("hex");

  const { error } = await sb.from("subscribers").upsert(
    { email, confirm_token: confirmToken, unsubscribe_token: unsubToken, confirmed_at: null },
    { onConflict: "email" },
  );
  if (error) {
    console.error("[subscribe] upsert failed", error);
    redirect("/subscribe?error=server");
  }

  const appUrl = process.env.APP_URL ?? "";
  const link = `${appUrl}/api/subscribe/confirm?token=${encodeURIComponent(confirmToken)}`;
  await sendEmail(
    email,
    "AIニュース・ダイジェストの購読確認",
    `<p>下記リンクをクリックして購読を確定してください。</p><p><a href="${link}">${link}</a></p>`,
  ).catch((e) => console.warn("[subscribe] email failed", e));

  redirect("/subscribe?status=sent");
}

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold mb-2">メール購読</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
        毎朝7時(JST)に、その日のAIニュース・ダイジェストをお届けします。配信解除はメール内のリンクからいつでも可能です。
      </p>

      {sp.status === "sent" && (
        <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900">
          確認メールを送信しました。メール内のリンクをクリックして購読を確定してください。
        </div>
      )}
      {sp.status === "confirmed" && (
        <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900">
          購読が確定しました。明日からダイジェストが届きます。
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200 dark:border-red-900">
          {sp.error === "invalid" ? "メールアドレスの形式が正しくありません。" : "サーバーエラーが発生しました。"}
        </div>
      )}

      <form action={subscribe} className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="flex-1 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-medium"
        >
          購読する
        </button>
      </form>
    </div>
  );
}
