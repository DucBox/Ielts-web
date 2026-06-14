ALTER TABLE student_email_events
  ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0;
