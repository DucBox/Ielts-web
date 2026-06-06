-- Migration 026: Add rewrite support to submissions

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rewrite_status TEXT DEFAULT NULL;

-- rewrite_status values:
--   NULL          → normal (graded & complete, or not yet graded)
--   'requested'   → teacher requested student rewrite
--   'rewritten'   → student submitted a new attempt; this row is superseded
