-- ============================================================
-- Migration 008: Ensure conversations/messages indexes & RLS
-- ============================================================

-- Indexes for performant conversation listing and message loading
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_store
  ON conversations(tenant_id, store_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
  ON conversations(updated_at DESC);
