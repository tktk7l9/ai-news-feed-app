import { tryGetServiceClient } from "@/lib/supabase/server";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function formatJstTime(isoString: string): string {
  const d = new Date(new Date(isoString).getTime() + JST_OFFSET_MS);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min} JST`;
}

export async function FooterUpdatedAt() {
  const sb = tryGetServiceClient();
  if (!sb) return <span>JST 06:00 / 18:00 更新</span>;

  const { data } = await sb
    .from("daily_digests")
    .select("generated_at")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.generated_at) return <span>JST 06:00 / 18:00 更新</span>;

  return <span>最終更新: {formatJstTime(data.generated_at)}</span>;
}
