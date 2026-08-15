-- One-time cleanup of exam sessions created by the old "opening the page starts the clock"
-- behaviour. The clock is now armed only by an explicit "Bắt đầu làm bài" press, but rows
-- written before that change still hold a start time from a student who merely peeked at the
-- exam. Left alone, those students would open the exam and be auto-submitted with a blank
-- paper on the spot.
--
-- Only rows that are BOTH fully expired AND have no submission are removed: a student who is
-- genuinely mid-exam keeps their running clock, and a student who already submitted keeps the
-- session that proves whether they were overtime. Deleting a row here just means the student
-- gets a fresh clock the next time they press "Bắt đầu".

DELETE FROM exam_sessions es
USING assignments a
WHERE es.ref_type = 'assignment'
  AND a.id = es.ref_id
  AND a.time_limit_minutes IS NOT NULL
  AND es.started_at + (a.time_limit_minutes * INTERVAL '1 minute') < NOW()
  AND NOT EXISTS (
    SELECT 1 FROM submissions s
    WHERE s.assignment_id = es.ref_id AND s.student_id = es.student_id
  );

-- shared_pool needs no cleanup: its start is already an explicit "Thi thật" press, and an
-- expired shared_pool session is reset on the next attempt anyway.

DELETE FROM composite_section_exam_sessions cs
USING composite_question_sections cqs
WHERE cqs.id = cs.section_id
  AND cqs.time_limit_minutes IS NOT NULL
  AND cs.started_at + (cqs.time_limit_minutes * INTERVAL '1 minute') < NOW()
  AND NOT EXISTS (
    SELECT 1 FROM composite_section_submissions css
    WHERE css.assignment_id = cs.assignment_id
      AND css.section_id = cs.section_id
      AND css.student_id = cs.student_id
  );
