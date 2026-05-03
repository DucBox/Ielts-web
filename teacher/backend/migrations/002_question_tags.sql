-- Migration: Add tags column to question_pool for filtering by topic/level/source.
-- Run once on NeonDB.

ALTER TABLE question_pool
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_question_pool_tags ON question_pool USING GIN (tags);
