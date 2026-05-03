-- Migration: Track when an assignment was auto-closed due to deadline.
-- Allows teacher to manually re-open an overdue assignment without it being auto-closed again on next read.
-- Run once on NeonDB.

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS last_auto_closed_at TIMESTAMPTZ;
