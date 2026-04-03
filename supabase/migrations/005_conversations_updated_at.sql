-- Migration 005: Add updated_at column to conversations table
-- Required for chat history ordering by most recent activity

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill updated_at from created_at for existing rows
UPDATE conversations
SET updated_at = created_at
WHERE updated_at IS NULL;
