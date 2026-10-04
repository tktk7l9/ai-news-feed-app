import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { runDailyDigest } from "@/lib/jobs/digest";

export const runtime = "nodejs";
export const maxDuration = 300;

function verifyBearerToken(provided: string | null, secret: string): boolean {
  if (!provided) return false;
  const expected = `Bearer ${secret}`;
  const key = randomBytes(32);
  const a = createHmac("sha256", key).update(provided).digest();
  const b = createHmac("sha256", key).update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !verifyBearerToken(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyDigest();
    return NextResponse.json(result);
  } catch (e) {
    // The message names the failed step (DigestStepError / GeminiError); the stack alone told nothing.
    console.error(`[cron] daily-digest failed: ${e instanceof Error ? e.message : String(e)}`, e);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }
}
