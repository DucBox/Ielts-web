-- Migration 031: Auth improvements
-- C2: student password reset token table (replace plaintext-password-email flow)
-- C3: token_version on students (logout/password-change invalidates old JWTs)
--
-- SAFE TO RE-RUN: all DDL is guarded with IF NOT EXISTS.

-- C3: track current token generation per student
ALTER TABLE students ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- C2: hashed reset tokens (plaintext only ever lives in the email link)
CREATE TABLE IF NOT EXISTS student_password_reset_tokens (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash        TEXT        NOT NULL UNIQUE,
  student_id        UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  expires_at        TIMESTAMPTZ NOT NULL,
  used_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_student_id
  ON student_password_reset_tokens(student_id);

-- Partial index: fast lookup of valid (unused, not-expired) tokens
CREATE INDEX IF NOT EXISTS idx_prt_valid
  ON student_password_reset_tokens(token_hash)
  WHERE used_at IS NULL;
