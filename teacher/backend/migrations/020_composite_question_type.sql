-- Migration 020: Composite question type in question_pool
-- Replaces the wrong approach from 019 (composite_assignments as separate entity)
-- Now composite is a skill type in question_pool, assigned like any other question

-- Drop old approach tables from migration 019
DROP TABLE IF EXISTS composite_submissions;
DROP TABLE IF EXISTS composite_sections;
DROP TABLE IF EXISTS composite_assignments;

-- Add 'composite' to skill_type enum (question_pool.skill uses this enum)
ALTER TYPE skill_type ADD VALUE IF NOT EXISTS 'composite';

-- Sections belonging to a composite question in question_pool
CREATE TABLE IF NOT EXISTS composite_question_sections (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  composite_id        UUID        NOT NULL REFERENCES question_pool(id) ON DELETE CASCADE,
  label               TEXT        NOT NULL,
  skill               TEXT        NOT NULL CHECK (skill IN ('reading','listening','writing','speaking')),
  questions_data      JSONB,
  prompt              TEXT,
  content_text        TEXT,
  content_blocks      JSONB,
  content_url         TEXT,
  content_urls        JSONB,
  script              TEXT,
  time_limit_minutes  INTEGER,
  question_offset     INTEGER     NOT NULL DEFAULT 0,
  display_order       INTEGER     NOT NULL DEFAULT 0
);

-- Per-section submissions (linked to assignments + sections + students)
CREATE TABLE IF NOT EXISTS composite_section_submissions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  section_id    UUID        NOT NULL REFERENCES composite_question_sections(id) ON DELETE CASCADE,
  student_id    UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  answers       JSONB,
  content       TEXT,
  audio_url     TEXT,
  audio_key     TEXT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_overtime   BOOLEAN     NOT NULL DEFAULT FALSE,
  score         NUMERIC(5,2),
  feedback      TEXT,
  UNIQUE (assignment_id, section_id, student_id)
);

-- Update exam_sessions ref_type constraint
ALTER TABLE exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_ref_type_check;
ALTER TABLE exam_sessions ADD CONSTRAINT exam_sessions_ref_type_check
  CHECK (ref_type IN ('assignment','shared_pool','composite_section'));

CREATE INDEX IF NOT EXISTS idx_cqs_composite
  ON composite_question_sections (composite_id, display_order);
CREATE INDEX IF NOT EXISTS idx_css_assignment
  ON composite_section_submissions (assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_css_section
  ON composite_section_submissions (section_id, student_id);
