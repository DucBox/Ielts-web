-- Track composite section timers per assignment so reusing the same composite
-- question in another class assignment does not reuse an old countdown.
CREATE TABLE IF NOT EXISTS composite_section_exam_sessions (
  student_id    UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assignment_id UUID        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  section_id    UUID        NOT NULL REFERENCES composite_question_sections(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, assignment_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_composite_section_exam_sessions_assignment
  ON composite_section_exam_sessions (assignment_id, section_id, student_id);
