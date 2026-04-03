-- Migration 006: Lease Risk Scores table
CREATE TABLE IF NOT EXISTS lease_risk_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  clause_scores JSONB NOT NULL DEFAULT '{}',
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, tenant_id)
);

ALTER TABLE lease_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own risk scores"
  ON lease_risk_scores FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Users can insert own risk scores"
  ON lease_risk_scores FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Users can update own risk scores"
  ON lease_risk_scores FOR UPDATE USING (tenant_id = auth.uid());
CREATE POLICY "Users can delete own risk scores"
  ON lease_risk_scores FOR DELETE USING (tenant_id = auth.uid());
