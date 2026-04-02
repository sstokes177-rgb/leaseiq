-- Migration 004: Add missing RLS DELETE/UPDATE policies
-- Fixes gaps identified in security audit

-- cam_reconciliations: was missing UPDATE and DELETE policies
CREATE POLICY "Users can update own cam_reconciliations"
  ON cam_reconciliations FOR UPDATE
  USING (tenant_id = auth.uid());

CREATE POLICY "Users can delete own cam_reconciliations"
  ON cam_reconciliations FOR DELETE
  USING (tenant_id = auth.uid());

-- percentage_rent_config: was missing DELETE policy
CREATE POLICY "Users can delete own percentage_rent_config"
  ON percentage_rent_config FOR DELETE
  USING (tenant_id = auth.uid());

-- occupancy_cost_overrides: was missing DELETE policy
CREATE POLICY "Users can delete own occupancy_cost_overrides"
  ON occupancy_cost_overrides FOR DELETE
  USING (tenant_id = auth.uid());
