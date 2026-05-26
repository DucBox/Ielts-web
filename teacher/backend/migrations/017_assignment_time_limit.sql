-- Add optional time limit to assignments (NULL = no timer)
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER;
