-- Migration: support multiple audio files per Speaking submission.
-- speaking_audio_urls stores ordered array of {url, key, name} objects.
-- speaking_audio_url remains the first file URL for backward compatibility.
-- Run once on NeonDB.

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS speaking_audio_urls JSONB DEFAULT '[]';
