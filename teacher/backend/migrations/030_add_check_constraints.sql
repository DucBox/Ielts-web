-- Migration 030: Add missing CHECK constraints for data integrity
--
-- SAFE TO RE-RUN: all use ADD CONSTRAINT IF NOT EXISTS (Postgres 9.x+ via DO block).

DO $$ BEGIN

  -- assignments.time_limit_minutes must be positive when set
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'assignments' AND constraint_name = 'chk_assignments_time_limit_positive'
  ) THEN
    ALTER TABLE assignments ADD CONSTRAINT chk_assignments_time_limit_positive
      CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0);
  END IF;

  -- assignments.scoring_scale must be a known value
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'assignments' AND constraint_name = 'chk_assignments_scoring_scale'
  ) THEN
    ALTER TABLE assignments ADD CONSTRAINT chk_assignments_scoring_scale
      CHECK (scoring_scale IN ('10', 'ielts', 'composite'));
  END IF;

  -- shared_pool.time_limit_minutes must be positive when set
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'shared_pool' AND constraint_name = 'chk_shared_pool_time_limit_positive'
  ) THEN
    ALTER TABLE shared_pool ADD CONSTRAINT chk_shared_pool_time_limit_positive
      CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0);
  END IF;

  -- composite_question_sections.time_limit_minutes must be positive when set
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'composite_question_sections' AND constraint_name = 'chk_composite_sections_time_limit_positive'
  ) THEN
    ALTER TABLE composite_question_sections ADD CONSTRAINT chk_composite_sections_time_limit_positive
      CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0);
  END IF;

  -- submissions.rewrite_status must be a known value when set
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'submissions' AND constraint_name = 'chk_submissions_rewrite_status'
  ) THEN
    ALTER TABLE submissions ADD CONSTRAINT chk_submissions_rewrite_status
      CHECK (rewrite_status IS NULL OR rewrite_status IN ('requested', 'rewritten'));
  END IF;

END $$;
