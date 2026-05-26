-- Composite (multi-skill) assignments
CREATE TABLE IF NOT EXISTS composite_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  mode        TEXT        NOT NULL DEFAULT 'exam' CHECK (mode IN ('practice','exam')),
  deadline    TIMESTAMPTZ,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each section = one question set within a composite assignment
CREATE TABLE IF NOT EXISTS composite_sections (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  composite_id        UUID        NOT NULL REFERENCES composite_assignments(id) ON DELETE CASCADE,
  label               TEXT        NOT NULL,                        -- teacher-defined name e.g. "Bài đọc 1"
  skill               TEXT        NOT NULL CHECK (skill IN ('reading','listening','writing','speaking')),
  question_id         UUID        NOT NULL REFERENCES question_pool(id) ON DELETE RESTRICT,
  time_limit_minutes  INTEGER,                                     -- NULL = no per-section limit
  question_offset     INTEGER     NOT NULL DEFAULT 0,              -- question numbering starts at offset+1
  display_order       INTEGER     NOT NULL DEFAULT 0
);

-- Submissions for each section (one row per student per section)
CREATE TABLE IF NOT EXISTS composite_submissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  composite_id    UUID        NOT NULL REFERENCES composite_assignments(id) ON DELETE CASCADE,
  section_id      UUID        NOT NULL REFERENCES composite_sections(id) ON DELETE CASCADE,
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  answers         JSONB,                                           -- for reading/listening
  content         TEXT,                                           -- for writing / speaking transcript
  audio_url       TEXT,                                           -- for speaking public URL
  audio_key       TEXT,                                           -- R2 key for cleanup
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_overtime     BOOLEAN     NOT NULL DEFAULT FALSE,
  score           NUMERIC(5,2),
  feedback        TEXT,
  UNIQUE (section_id, student_id)
);

-- Extend exam_sessions ref_type to support composite
ALTER TABLE exam_sessions
  DROP CONSTRAINT IF EXISTS exam_sessions_ref_type_check;

ALTER TABLE exam_sessions
  ADD CONSTRAINT exam_sessions_ref_type_check
  CHECK (ref_type IN ('assignment','shared_pool','composite_section','composite'));

CREATE INDEX IF NOT EXISTS idx_composite_sections_composite ON composite_sections (composite_id, display_order);
CREATE INDEX IF NOT EXISTS idx_composite_submissions_composite ON composite_submissions (composite_id, student_id);
CREATE INDEX IF NOT EXISTS idx_composite_submissions_section ON composite_submissions (section_id, student_id);
