import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { parseAIJson } from './parseAIJson'
import { INJECTION_DEFENSE, sanitizeChunkContent } from './security'

export interface CriticalDate {
  date_type: string
  date_value: string | null // ISO date YYYY-MM-DD, or null if no specific date
  description: string
  alert_days_before: number
}

/**
 * Uses Claude Haiku to extract critical dates from lease text.
 * Returns empty array on failure — never throws.
 */
export async function extractCriticalDates(text: string): Promise<CriticalDate[]> {
  try {
    const { text: result } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      maxOutputTokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${INJECTION_DEFENSE}Extract all critical dates from this commercial lease. Return a JSON array of objects with:
- "date_type": short label (e.g., "Lease Expiration", "Rent Commencement", "Renewal Option Deadline", "Rent Escalation", "CAM Audit Deadline", "Notice Deadline")
- "date_value": ISO date string YYYY-MM-DD, or null if only a duration is mentioned without a specific date
- "description": 1–2 sentences explaining what this date means for the tenant and any action required
- "alert_days_before": days in advance to alert (use 365 for lease expiration/renewal options, 90 for most others, 30 for payment/notice deadlines)

Focus on:
1. Lease expiration / term end date
2. Rent commencement date
3. Renewal / option exercise deadlines (these are critical — tenants often miss them)
4. Rent escalation / CPI adjustment dates
5. Notice period deadlines
6. CAM reconciliation objection/audit window deadlines
7. Personal guarantee expiration

Return ONLY a valid JSON array. Return [] if no specific dates are found.

Lease text:
${sanitizeChunkContent(text.slice(0, 8000))}`,
        },
      ],
    })

    const parsed = parseAIJson<unknown>(result)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((d) => d.date_type && d.description)
      .map((d) => ({
        date_type: String(d.date_type).slice(0, 100),
        date_value: d.date_value && /^\d{4}-\d{2}-\d{2}$/.test(d.date_value) ? d.date_value : null,
        description: String(d.description).slice(0, 500),
        alert_days_before: Number(d.alert_days_before) || 90,
      }))
  } catch {
    return []
  }
}
