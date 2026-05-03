-- Migration: add mixed content blocks support for question content (text + images)
-- Run once on NeonDB.

ALTER TABLE question_pool
  ADD COLUMN IF NOT EXISTS content_blocks JSONB;
