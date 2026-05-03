-- Migration: Add practice_attempts table for C1.1/C1.2 (retry wrong / retry full)
-- Run once on NeonDB.

CREATE TABLE IF NOT EXISTS practice_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID REFERENCES students(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  attempt_type  TEXT NOT NULL, -- 'retry_wrong' | 'retry_full'
  student_answers JSONB NOT NULL DEFAULT '[]',
  correct_count INT  NOT NULL DEFAULT 0,
  total_count   INT  NOT NULL DEFAULT 0,
  attempted_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_student ON practice_attempts (student_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_assignment ON practice_attempts (assignment_id);
