-- Add mode column to assignments for listening audio control
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'exam';
