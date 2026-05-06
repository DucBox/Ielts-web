-- Migration: student notification system.
-- Stores notifications of 3 types:
--   score_released   – Writing/Speaking submission graded by teacher
--   deadline_reminder – lazy-created when student fetches notifications (3/2/1 days before deadline)
--   new_assignment    – created when teacher assigns work to a class
-- Run once on NeonDB.

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('score_released', 'deadline_reminder', 'new_assignment')),
  ref_id      UUID        NOT NULL,   -- always assignment_id for consistent navigation
  metadata    JSONB       NOT NULL DEFAULT '{}',  -- {title, skill, score, deadline, days_left}
  is_read     BOOLEAN     NOT NULL DEFAULT false,
  day_bucket  TEXT,                   -- 'YYYY-MM-DD' used only for deadline_reminder dedup
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at     TIMESTAMPTZ
);

-- Fast lookup: unread notifications for a student
CREATE INDEX IF NOT EXISTS idx_notifications_student_created
  ON notifications(student_id, created_at DESC);

-- Dedup: one deadline_reminder per assignment per student per calendar day
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_deadline_dedup
  ON notifications(student_id, ref_id, day_bucket)
  WHERE type = 'deadline_reminder';

-- Dedup: one new_assignment notification per assignment per student
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_new_assignment_dedup
  ON notifications(student_id, ref_id)
  WHERE type = 'new_assignment';
