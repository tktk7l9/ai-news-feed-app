import { NextRequest, NextResponse } from "next/server";
import { ensureArticleAudio, ensureDigestAudio } from "@/lib/jobs/tts";
import { isSameOriginRequest, checkRateLimit } from "@/lib/api-guard";

export const runtime = "nodejs";
export const maxDuration = 60;

// 認証なしでプレイヤーから叩かれるエンドポイント。Gemini TTS (10 RPM) と
// service role 経由の DB 書込を起動するため、同一オリジン確認 + レート制限で
// 乱用コストを上げる。生成済み音声はキャッシュ返却なので正規利用はほぼ素通り。
const RATE_LIMIT = { perIpPerMinute: 6, globalPerMinute: 20 };

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const rate = checkRateLimit(req, "tts", RATE_LIMIT);
  if (!rate.ok) {
    console.warn(`[tts] rate limited: ${rate.reason}`);
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { type, id } = (body ?? {}) as { type?: string; id?: string };
  if (!type || !id || typeof type !== "string" || typeof id !== "string") {
    return NextResponse.json(
      { error: "type and id are required" },
      { status: 400 },
    );
  }

  try {
    let url: string;
    if (type === "article") {
      url = await ensureArticleAudio(id);
    } else if (type === "digest") {
      url = await ensureDigestAudio(id);
    } else {
      return NextResponse.json({ error: "invalid type" }, { status: 400 });
    }
    return NextResponse.json({ url });
  } catch (e) {
    // 内部詳細はログのみ。レスポンスは固定文言 (情報漏えい防止)。
    console.error("[tts] failed", e);
    if (e instanceof Error && /not found/.test(e.message)) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 },
    );
  }
}
