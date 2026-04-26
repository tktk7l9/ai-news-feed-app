-- Add is_model_release flag to articles.
-- Identifies new AI model / major-version launches for priority display.
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS is_model_release boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS articles_model_release_idx
  ON articles (digest_date DESC, is_model_release DESC, importance DESC);
