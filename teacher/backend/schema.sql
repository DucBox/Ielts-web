-- Current bootstrap schema for the IELTS Web Platform.
--
-- This file is intended for initializing a fresh NeonDB database so it matches
-- the production schema verified on 2026-05-04.
--
-- For existing databases, run migrations in teacher/backend/migrations/ instead
-- of relying on CREATE TABLE IF NOT EXISTS to reshape old tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE skill_type AS ENUM ('listening', 'reading', 'writing', 'speaking');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT
);

CREATE TABLE IF NOT EXISTS student_classes (
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, class_id)
);

CREATE TABLE IF NOT EXISTS question_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  skill skill_type NOT NULL,
  title TEXT NOT NULL,
  content_text TEXT,
  content_url TEXT,
  content_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  vocabulary JSONB DEFAULT '[]'::jsonb,
  content_blocks JSONB,
  tags TEXT[] DEFAULT '{}',
  script TEXT
);

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  question_id UUID REFERENCES question_pool(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  deadline TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_auto_closed_at TIMESTAMPTZ,
  mode TEXT NOT NULL DEFAULT 'exam'
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  student_answers JSONB,
  writing_content TEXT,
  speaking_audio_url TEXT,
  speaking_audio_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  speaking_script TEXT,
  ai_feedback JSONB,
  teacher_feedback JSONB,
  overall_score DOUBLE PRECISION,
  status TEXT DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  attempt_type TEXT NOT NULL,
  student_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  field_key TEXT,
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
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  definition TEXT NOT NULL DEFAULT '',
  pronunciation TEXT NOT NULL DEFAULT '',
  example TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, word)
);

CREATE TABLE IF NOT EXISTS vocab_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  practiced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_email_events (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('new_assignment', 'score_released', 'deadline_1day')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  provider_message_id TEXT,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, assignment_id, event_type)
);

CREATE TABLE IF NOT EXISTS student_email_dispatch_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  lease_owner TEXT,
  lease_until TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('score_released', 'deadline_reminder', 'new_assignment')),
  ref_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  day_bucket TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS r2_asset_refs (
  r2_key TEXT PRIMARY KEY,
  ref_count INT NOT NULL DEFAULT 1,
  last_touched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill TEXT NOT NULL CHECK (skill IN ('reading', 'listening', 'writing', 'speaking')),
  title TEXT NOT NULL DEFAULT '',
  content_text TEXT NOT NULL DEFAULT '',
  content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_url TEXT NOT NULL DEFAULT '',
  content_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  vocabulary JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  script TEXT NOT NULL DEFAULT '',
  time_limit_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  shared_pool_id UUID NOT NULL REFERENCES shared_pool(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('practice', 'real_test')),
  student_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  writing_content TEXT NOT NULL DEFAULT '',
  speaking_script TEXT NOT NULL DEFAULT '',
  speaking_audio_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_score NUMERIC(5,2),
  max_score INTEGER,
  ai_feedback JSONB,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES question_folders(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE question_pool
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES question_folders(id) ON DELETE SET NULL;

INSERT INTO student_email_dispatch_state (singleton)
VALUES (TRUE)
ON CONFLICT (singleton) DO NOTHING;

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

CREATE INDEX IF NOT EXISTS idx_question_pool_tags
  ON question_pool USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student
  ON submissions (assignment_id, student_id);

CREATE INDEX IF NOT EXISTS idx_submissions_student_assignment
  ON submissions (student_id, assignment_id);

CREATE INDEX IF NOT EXISTS idx_submissions_pending_grading
  ON submissions (assignment_id, submitted_at ASC)
  WHERE overall_score IS NULL;

CREATE INDEX IF NOT EXISTS idx_practice_attempts_student
  ON practice_attempts (student_id);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_assignment
  ON practice_attempts (assignment_id);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_student_attempted
  ON practice_attempts (student_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_fields_order
  ON profile_fields (display_order ASC, created_at ASC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_fields_field_key_unique
  ON profile_fields (field_key)
  WHERE field_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_vocab_saved
  ON student_vocab (student_id, saved_at DESC);

CREATE INDEX IF NOT EXISTS idx_vocab_sessions_student_practiced
  ON vocab_sessions (student_id, practiced_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_email_events_status_created
  ON student_email_events (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_student_created
  ON notifications (student_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_deadline_dedup
  ON notifications (student_id, ref_id, day_bucket)
  WHERE type = 'deadline_reminder';

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_new_assignment_dedup
  ON notifications (student_id, ref_id)
  WHERE type = 'new_assignment';

CREATE INDEX IF NOT EXISTS idx_r2_asset_refs_count
  ON r2_asset_refs (ref_count)
  WHERE ref_count <= 0;

CREATE INDEX IF NOT EXISTS shared_attempts_student_id_idx
  ON shared_attempts (student_id);

CREATE INDEX IF NOT EXISTS shared_attempts_pool_id_idx
  ON shared_attempts (shared_pool_id);

CREATE INDEX IF NOT EXISTS idx_question_pool_folder
  ON question_pool (folder_id);

-- Default teacher row for the current single-teacher deployment model.
INSERT INTO teachers (full_name, email)
VALUES ('Giáo viên', 'teacher@local.dev')
ON CONFLICT (email) DO NOTHING;

INSERT INTO profile_fields (label, field_key, field_type, display_order)
SELECT 'Gmail', 'notification_email', 'text', 999
WHERE NOT EXISTS (
  SELECT 1 FROM profile_fields WHERE field_key = 'notification_email'
);
