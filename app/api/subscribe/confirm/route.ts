import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  const sb = getServiceClient();
  const { data: row } = await sb
    .from("subscribers")
    .select("id, confirmed_at")
    .eq("confirm_token", token)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "invalid token" }, { status: 404 });

  if (!row.confirmed_at) {
    const { error } = await sb
      .from("subscribers")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return NextResponse.json({ error: "update failed" }, { status: 500 });
  }

  const appUrl = process.env.APP_URL ?? "";
  return NextResponse.redirect(`${appUrl}/subscribe?status=confirmed`);
}
