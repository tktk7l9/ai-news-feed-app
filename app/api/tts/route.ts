import { NextRequest, NextResponse } from "next/server";
import { ensureArticleAudio, ensureDigestAudio } from "@/lib/jobs/tts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
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
    console.error("[tts] failed", e);
    const message = e instanceof Error ? e.message : "internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
