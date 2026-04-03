export type UserRole = 'individual' | 'tenant_admin' | 'super_admin'

export interface TenantProfile {
  id: string
  company_name: string | null
  space_number: string | null
  property_name: string | null
  language_preference: string | null
  role: UserRole
  created_at: string
}

export interface Store {
  id: string
  tenant_id: string
  store_name: string
  shopping_center_name: string | null
  suite_number: string | null
  address: string | null
  created_at: string
}

export type DocumentType =
  | 'base_lease'
  | 'amendment'
  | 'commencement_letter'
  | 'exhibit'
  | 'side_letter'

export interface Document {
  id: string
  tenant_id: string
  store_id: string | null
  file_name: string
  file_path: string
  document_type: DocumentType
  display_name: string | null
  lease_identifiers: Record<string, string | null> | null
  uploaded_at: string
}

export interface DocumentChunk {
  id: string
  document_id: string
  tenant_id: string
  store_id: string | null
  content: string
  metadata: ChunkMetadata
  embedding?: number[]
  created_at: string
}

export interface ChunkMetadata {
  document_name: string
  document_type: string
  page_number?: number
  section_heading?: string
  chunk_index: number
}

export interface Conversation {
  id: string
  tenant_id: string
  store_id: string | null
  title: string | null
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  citations: Citation[] | null
  created_at: string
}

export interface Citation {
  chunk_id: string
  document_id?: string
  document_name: string
  document_type?: string
  section_heading?: string
  page_number?: number
  excerpt: string
  content?: string
  /** Set by ArticleRef click — drives article-specific chunk lookup in the side panel */
  articleNumber?: string
}

export interface LeaseSummaryData {
  tenant_name: string | null
  landlord_name: string | null
  property_address: string | null
  suite_number: string | null
  lease_start_date: string | null
  lease_end_date: string | null
  base_rent_monthly: string | null
  rent_escalation: string | null
  security_deposit: string | null
  permitted_use: string | null
  lease_type: string | null
  renewal_options: string | null
  square_footage: string | null
}

export interface LeaseSummary {
  id: string
  store_id: string
  tenant_id: string
  summary_data: LeaseSummaryData
  created_at: string
  updated_at: string
}

export interface ObligationItem {
  category: string
  responsible: 'Tenant' | 'Landlord' | 'Shared' | 'Not Addressed'
  article: string | null
  details: string
}

export interface ObligationMatrixRecord {
  id: string
  store_id: string
  tenant_id: string
  matrix_data: { obligations: ObligationItem[] }
  created_at: string
}

export interface CriticalDate {
  id: string
  document_id: string
  tenant_id: string
  store_id: string | null
  date_type: string
  date_value: string | null
  description: string
  alert_days_before: number
  created_at: string
}

// CAM Analysis
export interface CamAnalysisData {
  proportionate_share_pct: string | null
  admin_fee_pct: string | null
  cam_cap: string | null
  audit_window_days: number | null
  excluded_items: string[]
  included_items: string[]
  escalation_limit: string | null
}

export interface CamAnalysis {
  id: string
  store_id: string
  tenant_id: string
  analysis_data: CamAnalysisData
  created_at: string
}

// CAM Reconciliation
export interface CamOvercharge {
  item: string
  billed_amount: string
  expected_amount: string
  difference: string
  reason: string
}

export interface CamReconciliationData {
  total_billed: string | null
  potential_overcharges: CamOvercharge[]
  total_potential_savings: string | null
  recommendation: string | null
}

export interface CamReconciliation {
  id: string
  store_id: string
  tenant_id: string
  reconciliation_data: CamReconciliationData
  file_name: string | null
  created_at: string
}

// Percentage Rent
export interface PercentageRentEntry {
  id: string
  store_id: string
  tenant_id: string
  month: number
  year: number
  gross_sales: number
  created_at: string
}

export interface PercentageRentConfig {
  id: string
  store_id: string
  tenant_id: string
  breakpoint: number | null
  percentage: number | null
  analysis_data: {
    breakpoint_raw: string | null
    percentage_raw: string | null
    details: string | null
  }
  created_at: string
}

// Occupancy Cost
export interface OccupancyCostOverrides {
  id: string
  store_id: string
  tenant_id: string
  insurance_monthly: number | null
  tax_monthly: number | null
  other_monthly: number | null
  other_label: string | null
}

// Risk Scoring
export type ClauseSeverity = 'red' | 'yellow' | 'green'

export interface ClauseScore {
  clause: string
  category: 'expansion_blockers' | 'financial_exposure' | 'tenant_protections'
  severity: ClauseSeverity
  summary: string
  citation: string | null
  recommendation: string | null
}

export interface LeaseRiskScore {
  id: string
  store_id: string
  tenant_id: string
  overall_score: number
  clause_scores: ClauseScore[]
  analyzed_at: string
}

// CAM Forensic Audit
export type CamAuditRuleStatus = 'violation_found' | 'within_limits' | 'insufficient_data'

export interface CamAuditFinding {
  rule_name: string
  status: CamAuditRuleStatus
  estimated_overcharge: number
  explanation: string
  lease_reference: string | null
  statement_reference: string | null
}

export interface CamAuditResult {
  id: string
  store_id: string
  tenant_id: string
  statement_file_name: string
  total_potential_overcharge: number
  findings: CamAuditFinding[]
  audit_date: string
  dispute_deadline: string | null
}

// Notifications
export type NotificationType = 'critical_date' | 'risk_score' | 'cam_audit' | 'document' | 'system'

export interface Notification {
  id: string
  tenant_id: string
  store_id: string | null
  type: NotificationType
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
}

// Team
export interface TeamInvitation {
  id: string
  tenant_id: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  status: 'pending' | 'accepted' | 'revoked'
  created_at: string
}
