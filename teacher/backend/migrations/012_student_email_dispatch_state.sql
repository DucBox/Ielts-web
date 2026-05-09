CREATE TABLE IF NOT EXISTS student_email_dispatch_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  lease_owner TEXT,
  lease_until TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO student_email_dispatch_state (singleton)
VALUES (TRUE)
ON CONFLICT (singleton) DO NOTHING;
