-- Migration: move request-time DDL into schema setup and add hot-path indexes.
-- Run once on NeonDB.

ALTER TABLE question_pool
  ADD COLUMN IF NOT EXISTS script TEXT;

CREATE TABLE IF NOT EXISTS profile_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  options JSONB DEFAULT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_profile_answers (
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  field_id UUID REFERENCES profile_fields(id) ON DELETE CASCADE,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, field_id)
);

CREATE TABLE IF NOT EXISTS student_vocab (
  student_id  UUID REFERENCES students(id) ON DELETE CASCADE,
  word        TEXT NOT NULL,
  definition  TEXT NOT NULL DEFAULT '',
  example     TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT '',
  saved_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, word)
);

CREATE TABLE IF NOT EXISTS vocab_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID REFERENCES students(id) ON DELETE CASCADE,
  practiced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_created
  ON classes (teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_classes_class_student
  ON student_classes (class_id, student_id);

CREATE INDEX IF NOT EXISTS idx_assignments_class_created
  ON assignments (class_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_question
  ON assignments (question_id);

CREATE INDEX IF NOT EXISTS idx_assignments_auto_close
  ON assignments (is_active, deadline)
  WHERE deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_question_pool_skill_created
  ON question_pool (skill, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_question_pool_teacher_created
  ON question_pool (teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student
  ON submissions (assignment_id, student_id);

CREATE INDEX IF NOT EXISTS idx_submissions_student_assignment
  ON submissions (student_id, assignment_id);

CREATE INDEX IF NOT EXISTS idx_submissions_pending_grading
  ON submissions (assignment_id, submitted_at ASC)
  WHERE overall_score IS NULL;

CREATE INDEX IF NOT EXISTS idx_profile_fields_order
  ON profile_fields (display_order ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_student_vocab_saved
  ON student_vocab (student_id, saved_at DESC);

CREATE INDEX IF NOT EXISTS idx_vocab_sessions_student_practiced
  ON vocab_sessions (student_id, practiced_at DESC);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_student_attempted
  ON practice_attempts (student_id, attempted_at DESC);
