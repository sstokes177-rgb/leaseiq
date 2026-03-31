import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export interface LeaseIdentifiers {
  tenant_name: string | null
  property_name: string | null
  landlord_name: string | null
  suite_number: string | null
  is_lease_related: boolean
  document_type: 'base_lease' | 'amendment' | 'commencement_letter' | 'exhibit' | 'side_letter'
}

export interface ValidationResult {
  valid: boolean
  errorCode?: 'not_lease' | 'mismatch'
  error?: string
}

/** Extract key identifiers from lease text using Claude Haiku. */
export async function extractLeaseIdentifiers(text: string): Promise<LeaseIdentifiers> {
  try {
    const { text: result } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      maxOutputTokens: 250,
      messages: [
        {
          role: 'user',
          content: `Analyze this document excerpt and return a JSON object with:
- "is_lease_related": true if this is a lease, amendment, commencement letter, exhibit, addendum, or side letter. false if it's something unrelated (e.g., a receipt, invoice, or random document).
- "document_type": one of "base_lease", "amendment", "commencement_letter", "exhibit", or "side_letter". Use "amendment" for lease modifications/addenda, "commencement_letter" for lease commencement or estoppel letters, "exhibit" for attached exhibits or schedules, "side_letter" for side letters or LOIs, and "base_lease" for everything else.
- "tenant_name": the tenant/lessee business name, or null
- "property_name": the property, shopping center, or building name, or null
- "landlord_name": the landlord/lessor entity name, or null
- "suite_number": the suite, unit, or space number, or null

Return ONLY valid JSON with no explanation or markdown.

Document excerpt:
${text.slice(0, 3000)}`,
        },
      ],
    })

    const json = JSON.parse(result.trim().replace(/^```json\s*|\s*```$/g, ''))
    const validTypes = ['base_lease', 'amendment', 'commencement_letter', 'exhibit', 'side_letter']
    return {
      tenant_name: json.tenant_name ?? null,
      property_name: json.property_name ?? null,
      landlord_name: json.landlord_name ?? null,
      suite_number: json.suite_number ?? null,
      is_lease_related: Boolean(json.is_lease_related),
      document_type: validTypes.includes(json.document_type) ? json.document_type : 'base_lease',
    }
  } catch {
    return {
      tenant_name: null,
      property_name: null,
      landlord_name: null,
      suite_number: null,
      is_lease_related: true,
      document_type: 'base_lease',
    }
  }
}

/** Normalize a string for fuzzy comparison. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Returns true only if two non-empty strings are clearly unrelated
 * (neither is a substring of the other after normalization).
 * This is intentionally lenient to avoid blocking legitimate amendments.
 */
function isClearMismatch(a: string, b: string): boolean {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return false
  return !na.includes(nb) && !nb.includes(na)
}

/**
 * Check a new document's identifiers against the reference (first existing) document.
 * Only rejects on strong mismatches — different tenant AND different property, or
 * a clearly different tenant entity alone.
 */
export function checkMismatch(
  newDoc: LeaseIdentifiers,
  reference: LeaseIdentifiers,
  referenceDisplayName: string | null
): ValidationResult {
  const tenantMismatch =
    newDoc.tenant_name && reference.tenant_name
      ? isClearMismatch(newDoc.tenant_name, reference.tenant_name)
      : false

  const propertyMismatch =
    newDoc.property_name && reference.property_name
      ? isClearMismatch(newDoc.property_name, reference.property_name)
      : false

  const refLabel =
    referenceDisplayName ||
    [reference.tenant_name, reference.property_name].filter(Boolean).join(' at ') ||
    'your existing lease'

  // Reject only if both tenant AND property are clearly different
  if (tenantMismatch && propertyMismatch) {
    const newLabel = [newDoc.tenant_name, newDoc.property_name].filter(Boolean).join(' at ')
    return {
      valid: false,
      errorCode: 'mismatch',
      error: `This document appears to be for ${newLabel}, but your existing lease is for ${refLabel}. Please upload documents related to your current lease only.`,
    }
  }

  // Reject if tenant entity is clearly different (strong signal even without property match)
  if (tenantMismatch && newDoc.tenant_name && reference.tenant_name) {
    return {
      valid: false,
      errorCode: 'mismatch',
      error: `This document appears to be for a different tenant ("${newDoc.tenant_name}"), but your existing lease is for ${refLabel}. Please upload documents related to your current lease only.`,
    }
  }

  return { valid: true }
}
