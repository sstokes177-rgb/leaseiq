-- ============================================================
-- Migration 011: Add configurable reminder lead times to critical_dates
-- ============================================================

ALTER TABLE critical_dates
  ADD COLUMN IF NOT EXISTS reminder_days INTEGER[] DEFAULT '{30}';
