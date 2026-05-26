-- Track when a student first opens an exam (source of truth for time limit)
CREATE TABLE IF NOT EXISTS exam_sessions (
  student_id  UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  ref_type    TEXT        NOT NULL CHECK (ref_type IN ('assignment', 'shared_pool')),
  ref_id      UUID        NOT NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, ref_type, ref_id)
);

-- Record whether a submission was made after time expired
ALTER TABLE submissions    ADD COLUMN IF NOT EXISTS is_overtime BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE shared_attempts ADD COLUMN IF NOT EXISTS is_overtime BOOLEAN NOT NULL DEFAULT FALSE;
