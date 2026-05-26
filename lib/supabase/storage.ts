import { getServiceClient } from "@/lib/supabase/server";

const BUCKET = "tts-audio";

export async function uploadAudio(
  path: string,
  data: Buffer,
  contentType = "audio/wav",
): Promise<string> {
  const sb = getServiceClient();
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, data, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: publicData } = sb.storage.from(BUCKET).getPublicUrl(path);
  return publicData.publicUrl;
}
