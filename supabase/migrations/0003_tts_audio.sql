-- TTS (text-to-speech) audio caches.
-- Each article and daily digest can have a pre-generated audio file
-- stored in the public `tts-audio` Storage bucket.

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS audio_url text;

ALTER TABLE daily_digests
  ADD COLUMN IF NOT EXISTS audio_url text;

-- Public bucket: object URLs are world-readable so the browser <audio>
-- element can fetch directly. Writes are done via service_role only.
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-audio', 'tts-audio', true)
ON CONFLICT (id) DO NOTHING;
