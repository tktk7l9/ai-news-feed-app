-- Remove TTS audio playback feature: drop the audio_url columns added in
-- 0003_tts_audio.sql. The tts-audio storage bucket is left in place here;
-- delete it (and its objects) manually via the Supabase dashboard once
-- you've confirmed you no longer need the generated audio files.

ALTER TABLE articles
  DROP COLUMN IF EXISTS audio_url;

ALTER TABLE daily_digests
  DROP COLUMN IF EXISTS audio_url;
