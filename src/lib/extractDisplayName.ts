import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { INJECTION_DEFENSE, sanitizeChunkContent } from './security'

/**
 * Uses Claude Haiku to extract a short human-readable display label from
 * the opening text of a commercial lease — e.g. "Embark Health — Pearson's Corner".
 * Returns null if the name cannot be determined.
 */
export async function extractDisplayName(text: string): Promise<string | null> {
  const { text: result } = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    maxOutputTokens: 60,
    messages: [
      {
        role: 'user',
        content: `${INJECTION_DEFENSE}You are reading the opening section of a commercial retail lease. Extract a short display label that identifies this lease for the tenant.

Format: "Tenant Name — Property or Location Name"
If only one of those is identifiable, use just that.
If neither is clear, return: null

Rules:
- Use the tenant's business name, not "Tenant" or "Lessee"
- Use the property name, shopping center name, or street address for location
- Keep the result under 80 characters
- Return ONLY the label string, or the word null — no explanation

Lease excerpt:
${text.slice(0, 2000)}`,
      },
    ],
  })

  const trimmed = result.trim()
  if (!trimmed || trimmed.toLowerCase() === 'null') return null
  // Strip any surrounding quotes the model might add
  return trimmed.replace(/^["']|["']$/g, '').slice(0, 100)
}
