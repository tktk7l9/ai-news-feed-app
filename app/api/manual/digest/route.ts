import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { runDailyDigest, type DigestProgress } from "@/lib/jobs/digest";

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

type StreamEvent =
  | { type: "progress"; progress: DigestProgress }
  | { type: "done"; result: Awaited<ReturnType<typeof runDailyDigest>> }
  | { type: "error"; error: string };

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !verifyBearerToken(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      try {
        const result = await runDailyDigest((progress) => {
          send({ type: "progress", progress });
        });
        send({ type: "done", result });
      } catch (e) {
        console.error("[manual] digest failed", e);
        const message = e instanceof Error ? e.message : "internal server error";
        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
