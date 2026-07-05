-- Migration 035: configurable suggested minimum word count for Writing
--
-- Previously the "minimum word count" shown to students (and checked in the
-- submit-confirmation modal) was a hardcoded "150 (Task 1) / 250 (Task 2)"
-- pair everywhere, unrelated to the actual assignment. This lets a teacher
-- set a single suggested minimum per assignment (regular Writing) or per
-- composite section (Writing section inside a multi-skill test) — same
-- placement convention as `time_limit_minutes`, which is already per-section
-- for composite rather than per-assignment.
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS min_word_count INTEGER;

ALTER TABLE composite_question_sections
  ADD COLUMN IF NOT EXISTS min_word_count INTEGER;
