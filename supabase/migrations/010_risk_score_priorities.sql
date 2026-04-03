-- Migration 010: Add top_3_priorities column to lease_risk_scores
ALTER TABLE lease_risk_scores
  ADD COLUMN IF NOT EXISTS top_3_priorities JSONB NOT NULL DEFAULT '[]';
