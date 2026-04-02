export type UserRole = 'individual' | 'tenant_admin' | 'property_manager' | 'super_admin'

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
  document_name: string
  document_type?: string
  section_heading?: string
  page_number?: number
  excerpt: string
  content?: string
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
