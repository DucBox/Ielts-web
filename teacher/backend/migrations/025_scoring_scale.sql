-- Migration 025: Add scoring_scale to assignments + recalculate existing scores

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS scoring_scale VARCHAR(10) NOT NULL DEFAULT '10';

-- Speaking / Writing are always IELTS band scale (AI-graded 0-9)
UPDATE assignments a
  SET scoring_scale = 'ielts'
  FROM question_pool q
  WHERE a.question_id = q.id
    AND q.skill IN ('speaking', 'writing');

-- Reading / Listening with exactly 40 questions → IELTS scale
UPDATE assignments a
  SET scoring_scale = 'ielts'
  FROM question_pool q
  WHERE a.question_id = q.id
    AND q.skill IN ('reading', 'listening')
    AND q.questions_data IS NOT NULL
    AND jsonb_array_length(q.questions_data) = 40;

-- ── Recalculate overall_score for reading/listening submissions ────────────

-- 1. Thang 10: non-40-question R/L  →  old_score * (10/9)
UPDATE submissions s
  SET overall_score = ROUND(s.overall_score::numeric * (10.0 / 9.0), 1)
  FROM assignments a
  JOIN question_pool q ON q.id = a.question_id
  WHERE s.assignment_id = a.id
    AND q.skill IN ('reading', 'listening')
    AND a.scoring_scale = '10'
    AND s.overall_score IS NOT NULL;

-- 2. IELTS: 40-question R/L → reverse-engineer correct count, apply IELTS table
WITH ielts_table(correct, band) AS (
  VALUES
    (0,  0.0::numeric), (1,  1.0), (2,  2.0),
    (3,  2.5), (4,  2.5),
    (5,  3.0), (6,  3.0),
    (7,  3.5), (8,  3.5), (9,  3.5),
    (10, 4.0), (11, 4.0), (12, 4.0),
    (13, 4.5), (14, 4.5), (15, 4.5),
    (16, 5.0), (17, 5.0),
    (18, 5.5), (19, 5.5), (20, 5.5), (21, 5.5), (22, 5.5),
    (23, 6.0), (24, 6.0), (25, 6.0), (26, 6.0),
    (27, 6.5), (28, 6.5), (29, 6.5),
    (30, 7.0), (31, 7.0), (32, 7.0),
    (33, 7.5), (34, 7.5),
    (35, 8.0), (36, 8.0),
    (37, 8.5), (38, 8.5),
    (39, 9.0), (40, 9.0)
),
derived AS (
  SELECT s.id,
         LEAST(40, GREATEST(0, ROUND(s.overall_score::numeric * 40.0 / 9.0)::int)) AS correct_count
  FROM submissions s
  JOIN assignments a ON s.assignment_id = a.id
  JOIN question_pool q ON q.id = a.question_id
  WHERE q.skill IN ('reading', 'listening')
    AND a.scoring_scale = 'ielts'
    AND s.overall_score IS NOT NULL
)
UPDATE submissions s
  SET overall_score = it.band
  FROM derived d
  JOIN ielts_table it ON it.correct = d.correct_count
  WHERE s.id = d.id;
