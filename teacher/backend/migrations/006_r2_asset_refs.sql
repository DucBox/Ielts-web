-- Migration: add r2_asset_refs table for shared R2 asset reference counting.
-- Run once on NeonDB.

CREATE TABLE IF NOT EXISTS r2_asset_refs (
  r2_key          TEXT PRIMARY KEY,
  ref_count       INT NOT NULL DEFAULT 1,
  last_touched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_r2_asset_refs_count
  ON r2_asset_refs (ref_count)
  WHERE ref_count <= 0;
