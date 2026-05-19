-- Hierarchical folder/category system for question_pool
-- Teachers can create arbitrary folder trees and move questions between them.
-- Questions at root (folder_id IS NULL) are "Chưa phân loại".
CREATE TABLE IF NOT EXISTS question_folders (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  parent_id     UUID        REFERENCES question_folders(id) ON DELETE CASCADE,
  display_order INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE question_pool ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES question_folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_question_pool_folder ON question_pool(folder_id);
