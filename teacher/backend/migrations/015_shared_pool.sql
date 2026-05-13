-- Kho đề chung: teacher-created questions auto-available to all enrolled students
CREATE TABLE IF NOT EXISTS shared_pool (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  skill               TEXT        NOT NULL CHECK (skill IN ('reading','listening','writing','speaking')),
  title               TEXT        NOT NULL DEFAULT '',
  content_text        TEXT        NOT NULL DEFAULT '',
  content_blocks      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  content_url         TEXT        NOT NULL DEFAULT '',
  content_urls        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  questions_data      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  vocabulary          JSONB       NOT NULL DEFAULT '[]'::jsonb,
  tags                TEXT[]      NOT NULL DEFAULT '{}',
  script              TEXT        NOT NULL DEFAULT '',
  time_limit_minutes  INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student attempts on shared pool questions (unlimited, both practice & real_test)
CREATE TABLE IF NOT EXISTS shared_attempts (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  shared_pool_id      UUID        NOT NULL REFERENCES shared_pool(id) ON DELETE CASCADE,
  mode                TEXT        NOT NULL CHECK (mode IN ('practice','real_test')),
  student_answers     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  writing_content     TEXT        NOT NULL DEFAULT '',
  speaking_script     TEXT        NOT NULL DEFAULT '',
  speaking_audio_urls JSONB       NOT NULL DEFAULT '[]'::jsonb,
  overall_score       NUMERIC(5,2),
  max_score           INTEGER,
  ai_feedback         JSONB,
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shared_attempts_student_id_idx  ON shared_attempts(student_id);
CREATE INDEX IF NOT EXISTS shared_attempts_pool_id_idx     ON shared_attempts(shared_pool_id);
