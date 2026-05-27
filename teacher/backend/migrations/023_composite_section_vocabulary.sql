ALTER TABLE composite_question_sections
  ADD COLUMN IF NOT EXISTS vocabulary JSONB NOT NULL DEFAULT '[]'::jsonb;
