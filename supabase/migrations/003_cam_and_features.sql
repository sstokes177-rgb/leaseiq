-- Phase 3B-3E: CAM Intelligence, Financial Tools, Monitoring, Settings

-- CAM Analysis table
CREATE TABLE IF NOT EXISTS cam_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cam_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own CAM analysis" ON cam_analysis FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Users can insert own CAM analysis" ON cam_analysis FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Users can update own CAM analysis" ON cam_analysis FOR UPDATE USING (tenant_id = auth.uid());

-- CAM Reconciliation results
CREATE TABLE IF NOT EXISTS cam_reconciliations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reconciliation_data JSONB NOT NULL DEFAULT '{}',
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE cam_reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own CAM reconciliations" ON cam_reconciliations FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Users can insert own CAM reconciliations" ON cam_reconciliations FOR INSERT WITH CHECK (tenant_id = auth.uid());

-- Percentage rent entries
CREATE TABLE IF NOT EXISTS percentage_rent_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  gross_sales NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, month, year)
);

ALTER TABLE percentage_rent_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own percentage rent" ON percentage_rent_entries FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Users can insert own percentage rent" ON percentage_rent_entries FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Users can update own percentage rent" ON percentage_rent_entries FOR UPDATE USING (tenant_id = auth.uid());
CREATE POLICY "Users can delete own percentage rent" ON percentage_rent_entries FOR DELETE USING (tenant_id = auth.uid());

-- Percentage rent analysis (extracted breakpoint/percentage from lease)
CREATE TABLE IF NOT EXISTS percentage_rent_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  breakpoint NUMERIC(12,2),
  percentage NUMERIC(5,3),
  analysis_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, tenant_id)
);

ALTER TABLE percentage_rent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pct rent config" ON percentage_rent_config FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Users can insert own pct rent config" ON percentage_rent_config FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Users can update own pct rent config" ON percentage_rent_config FOR UPDATE USING (tenant_id = auth.uid());

-- Occupancy cost overrides (insurance, taxes, etc.)
CREATE TABLE IF NOT EXISTS occupancy_cost_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insurance_monthly NUMERIC(10,2),
  tax_monthly NUMERIC(10,2),
  other_monthly NUMERIC(10,2),
  other_label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, tenant_id)
);

ALTER TABLE occupancy_cost_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own cost overrides" ON occupancy_cost_overrides FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Users can insert own cost overrides" ON occupancy_cost_overrides FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Users can update own cost overrides" ON occupancy_cost_overrides FOR UPDATE USING (tenant_id = auth.uid());

-- Team invitations
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own team invitations" ON team_invitations FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Users can insert own team invitations" ON team_invitations FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Users can update own team invitations" ON team_invitations FOR UPDATE USING (tenant_id = auth.uid());
CREATE POLICY "Users can delete own team invitations" ON team_invitations FOR DELETE USING (tenant_id = auth.uid());

-- Notification preferences
ALTER TABLE tenant_profiles ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"critical_dates": true, "cam_deadlines": true, "rent_escalations": true, "weekly_digest": false}';
ALTER TABLE tenant_profiles ADD COLUMN IF NOT EXISTS display_theme TEXT DEFAULT 'dark';
