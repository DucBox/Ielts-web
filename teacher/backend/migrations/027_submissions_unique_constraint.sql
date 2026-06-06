-- Prevent duplicate submissions: one attempt_number per student per assignment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uniq_submission_attempt'
  ) THEN
    ALTER TABLE submissions
      ADD CONSTRAINT uniq_submission_attempt
      UNIQUE (assignment_id, student_id, attempt_number);
  END IF;
END$$;
