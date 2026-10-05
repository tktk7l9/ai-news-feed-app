import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { runDailyDigest } from "@/lib/jobs/digest";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
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
