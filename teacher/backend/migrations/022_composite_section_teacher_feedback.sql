ALTER TABLE composite_section_submissions
  ADD COLUMN IF NOT EXISTS teacher_feedback JSONB;
