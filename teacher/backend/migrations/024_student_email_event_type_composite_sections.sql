ALTER TABLE student_email_events
  DROP CONSTRAINT IF EXISTS student_email_events_event_type_check;

ALTER TABLE student_email_events
  ADD CONSTRAINT student_email_events_event_type_check
  CHECK (
    event_type IN ('new_assignment', 'deadline_1day', 'score_released')
    OR event_type LIKE 'score_released:%'
  );
