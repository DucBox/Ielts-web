-- Migration 034: composite_completion view
--
-- Centralizes the "has this student submitted every section of this composite
-- assignment" check. Previously this exact subquery (count of distinct
-- submitted sections >= total sections in the composite) was copy-pasted
-- verbatim in 6+ places across worker.js (deadline reminders, notification
-- read/count endpoints, class analytics, submit-time notification cleanup).
-- Any future change to what "composite fully submitted" means now only needs
-- to touch this view.
CREATE OR REPLACE VIEW composite_completion AS
SELECT
  css.assignment_id,
  css.student_id,
  COUNT(DISTINCT css.section_id)::int AS submitted_sections,
  (SELECT COUNT(*) FROM composite_question_sections cqs
     JOIN assignments a2 ON a2.id = css.assignment_id
     WHERE cqs.composite_id = a2.question_id)::int AS total_sections,
  MAX(css.submitted_at) AS submitted_at,
  COUNT(css.id) FILTER (WHERE css.score IS NOT NULL)::int AS scored_count,
  AVG(css.score) FILTER (WHERE css.score IS NOT NULL)::float AS avg_score
FROM composite_section_submissions css
GROUP BY css.assignment_id, css.student_id;
