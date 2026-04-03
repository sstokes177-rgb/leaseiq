-- Migration 007: CAM Forensic Audits table
CREATE TABLE IF NOT EXISTS cam_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statement_file_name TEXT NOT NULL,
  total_potential_overcharge NUMERIC(12,2) NOT NULL DEFAULT 0,
  findings JSONB NOT NULL DEFAULT '[]',
  audit_date TIMESTAMPTZ DEFAULT now(),
  dispute_deadline TIMESTAMPTZ
);

ALTER TABLE cam_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cam audits"
  ON cam_audits FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Users can insert own cam audits"
  ON cam_audits FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Users can update own cam audits"
  ON cam_audits FOR UPDATE USING (tenant_id = auth.uid());
CREATE POLICY "Users can delete own cam audits"
  ON cam_audits FOR DELETE USING (tenant_id = auth.uid());
