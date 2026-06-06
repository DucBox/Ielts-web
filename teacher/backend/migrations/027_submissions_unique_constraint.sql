-- Prevent duplicate submissions: one attempt_number per student per assignment
ALTER TABLE submissions
  ADD CONSTRAINT IF NOT EXISTS uniq_submission_attempt
  UNIQUE (assignment_id, student_id, attempt_number);
