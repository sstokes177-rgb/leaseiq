import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export interface DocumentClassification {
  category: 'lease' | 'property_related' | 'unrelated'
  document_type: string
  description: string
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Classify a document based on its extracted text content.
 * Returns category (lease, property_related, unrelated) and a brief description.
 * On failure, defaults to allowing the upload (category: 'lease').
 */
export async function classifyDocument(extractedText: string): Promise<DocumentClassification> {
  try {
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      maxOutputTokens: 100,
      messages: [{
        role: 'user',
        content: `Classify this document. Read the text below and determine what type of document it is.

Return ONLY a JSON object with these fields:
- category: "lease" | "property_related" | "unrelated"
- document_type: brief type label (e.g. "base_lease", "amendment", "parking_rules", "building_handbook", "insurance_certificate", etc.)
- description: brief 5-10 word description of what the document is
- confidence: "high" | "medium" | "low"

"lease" means it IS a lease document: base leases, amendments, exhibits, commencement letters, side letters, addendums, lease abstracts, estoppel certificates.

"property_related" means it relates to commercial real estate or property management but is NOT a lease document: shopping center handbooks, parking rules/guidelines, property manager communications, building rules and regulations, insurance certificates, CAM reconciliation statements, tenant improvement agreements, construction documents, zoning documents, environmental reports.

"unrelated" means it has nothing to do with commercial real estate, property, or leases: personal documents, recipes, homework, financial statements unrelated to the property, random content.

TEXT:
${extractedText.slice(0, 1000)}`,
      }],
    })

    const json = JSON.parse(text.trim().replace(/^```json\s*|\s*```$/g, ''))
    const validCategories = ['lease', 'property_related', 'unrelated']
    const validConfidence = ['high', 'medium', 'low']

    return {
      category: validCategories.includes(json.category) ? json.category : 'lease',
      document_type: typeof json.document_type === 'string' ? json.document_type : 'unknown',
      description: typeof json.description === 'string' ? json.description : 'Unknown document',
      confidence: validConfidence.includes(json.confidence) ? json.confidence : 'medium',
    }
  } catch {
    // If classification fails, default to allowing the upload
    return {
      category: 'lease',
      document_type: 'unknown',
      description: 'Classification unavailable',
      confidence: 'low',
    }
  }
}
