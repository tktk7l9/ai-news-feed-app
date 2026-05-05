import { tryGetServiceClient } from "@/lib/supabase/server";
import { formatJpDate } from "@/lib/date";

export async function FooterUpdatedAt() {
  const sb = tryGetServiceClient();
  if (!sb) return <span>毎朝 JST 06:00 更新</span>;

  const { data } = await sb
    .from("daily_digests")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.date) return <span>毎朝 JST 06:00 更新</span>;

  return <span>最終更新: {formatJpDate(data.date)}</span>;
}
