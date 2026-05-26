import { generateTts } from "@/lib/gemini/tts";
import { uploadAudio } from "@/lib/supabase/storage";
import { getServiceClient } from "@/lib/supabase/server";

export async function ensureArticleAudio(articleId: string): Promise<string> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("articles")
    .select("id, audio_url, title_ja, summary_ja")
    .eq("id", articleId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`article not found: ${articleId}`);
  if (data.audio_url) return data.audio_url;

  const text = `${data.title_ja}。${data.summary_ja}`;
  const wav = await generateTts(text);
  const url = await uploadAudio(`articles/${articleId}.wav`, wav);

  const { error: upErr } = await sb
    .from("articles")
    .update({ audio_url: url })
    .eq("id", articleId);
  if (upErr) throw upErr;

  return url;
}

export async function ensureDigestAudio(date: string): Promise<string> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("daily_digests")
    .select("date, audio_url, overview_ja")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`digest not found: ${date}`);
  if (data.audio_url) return data.audio_url;

  const wav = await generateTts(data.overview_ja);
  const url = await uploadAudio(`digests/${date}.wav`, wav);

  const { error: upErr } = await sb
    .from("daily_digests")
    .update({ audio_url: url })
    .eq("date", date);
  if (upErr) throw upErr;

  return url;
}
