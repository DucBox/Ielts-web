-- Idempotency key for shared pool attempts
-- Prevents duplicate submissions from network retries / double-clicks.
-- NULL means "legacy attempt with no key" — multiple NULLs are allowed (partial index).
ALTER TABLE shared_attempts ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_attempts_idempotency
  ON shared_attempts (student_id, shared_pool_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
