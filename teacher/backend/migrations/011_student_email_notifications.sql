-- Migration: student email notifications via profile-linked notification email.
-- Adds canonical students.email, profile_fields.field_key, and email event log table.
-- Run once on NeonDB.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE profile_fields
  ADD COLUMN IF NOT EXISTS field_key TEXT;

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

DO $$
DECLARE
  email_field_id UUID;
BEGIN
  SELECT id
  INTO email_field_id
  FROM profile_fields
  WHERE field_key = 'notification_email'
     OR lower(label) = 'gmail'
     OR lower(label) = 'email'
     OR lower(label) LIKE '%gmail%'
     OR lower(label) LIKE '%email%'
  ORDER BY
    CASE
      WHEN field_key = 'notification_email' THEN 0
      WHEN lower(label) = 'gmail' THEN 1
      WHEN lower(label) = 'email' THEN 2
      ELSE 3
    END,
    display_order ASC,
    created_at ASC
  LIMIT 1;

  IF email_field_id IS NOT NULL THEN
    UPDATE profile_fields
    SET field_key = 'notification_email'
    WHERE id = email_field_id;
  END IF;
END $$;

INSERT INTO profile_fields (label, field_key, field_type, display_order)
SELECT 'Gmail', 'notification_email', 'text', 999
WHERE NOT EXISTS (
  SELECT 1 FROM profile_fields WHERE field_key = 'notification_email'
);

UPDATE students s
SET email = lower(trim(spa.value))
FROM student_profile_answers spa
JOIN profile_fields pf ON pf.id = spa.field_id
WHERE pf.field_key = 'notification_email'
  AND spa.student_id = s.id
  AND spa.value IS NOT NULL
  AND trim(spa.value) <> ''
  AND lower(trim(spa.value)) ~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_fields_field_key_unique
  ON profile_fields (field_key)
  WHERE field_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_email_events_status_created
  ON student_email_events (status, created_at DESC);
