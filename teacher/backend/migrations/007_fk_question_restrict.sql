-- Migration: change assignments.question_id FK from CASCADE to RESTRICT
-- so deleting a question that is still used in assignments is blocked at DB level.
-- Run once on NeonDB.

ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_question_id_fkey;

ALTER TABLE assignments
  ADD CONSTRAINT assignments_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES question_pool(id) ON DELETE RESTRICT;
