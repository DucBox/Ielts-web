-- Migration: support multiple audio files per Listening question.
-- content_urls stores ordered array of {url, key, name} objects.
-- content_url remains the first file URL for backward compatibility.
-- Run once on NeonDB.

ALTER TABLE question_pool
  ADD COLUMN IF NOT EXISTS content_urls JSONB DEFAULT '[]';
