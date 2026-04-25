import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  const sb = getServiceClient();
  const { error } = await sb.from("subscribers").delete().eq("unsubscribe_token", token);
  if (error) return NextResponse.json({ error: "delete failed" }, { status: 500 });

  return new NextResponse(
    `<!doctype html><html lang="ja"><body style="font-family:sans-serif;text-align:center;padding:48px"><h1>配信を解除しました</h1><p>ご利用ありがとうございました。</p></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
