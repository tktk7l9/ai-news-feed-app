import { generateTts } from "@/lib/gemini/tts";
import { uploadAudio } from "@/lib/supabase/storage";
import { getServiceClient } from "@/lib/supabase/server";

// Gemini Flash TTS free-tier: 10 RPM. Each call ~15-25s, so concurrency 3
// keeps us at ~9 RPM peak with a safe margin.
const TTS_CONCURRENCY = 3;

export type TtsBatchResult = {
  generated: number;
  failed: number;
  skipped: number;
};

export type TtsBatchProgress = {
  done: number;
  total: number;
};

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

export async function generateTtsForDigest(
  date: string,
  onProgress?: (p: TtsBatchProgress) => void,
): Promise<TtsBatchResult> {
  const sb = getServiceClient();

  const [digestRes, articlesRes] = await Promise.all([
    sb
      .from("daily_digests")
      .select("date, audio_url")
      .eq("date", date)
      .maybeSingle(),
    sb.from("articles").select("id, audio_url").eq("digest_date", date),
  ]);

  if (digestRes.error) throw digestRes.error;
  if (articlesRes.error) throw articlesRes.error;

  type Task = { type: "article" | "digest"; id: string };
  const tasks: Task[] = [];

  if (digestRes.data && !digestRes.data.audio_url) {
    tasks.push({ type: "digest", id: date });
  }
  for (const a of articlesRes.data ?? []) {
    if (!a.audio_url) tasks.push({ type: "article", id: a.id });
  }

  const total = (articlesRes.data?.length ?? 0) + (digestRes.data ? 1 : 0);
  const skipped = total - tasks.length;

  let generated = 0;
  let failed = 0;
  let done = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < tasks.length) {
      const idx = cursor++;
      const task = tasks[idx];
      try {
        if (task.type === "article") {
          await ensureArticleAudio(task.id);
        } else {
          await ensureDigestAudio(task.id);
        }
        generated++;
      } catch (e) {
        console.warn(`[tts] failed for ${task.type}:${task.id}`, e);
        failed++;
      }
      done++;
      onProgress?.({ done, total: tasks.length });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(TTS_CONCURRENCY, tasks.length) }, worker),
  );

  return { generated, failed, skipped };
}
