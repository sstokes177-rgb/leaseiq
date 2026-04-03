/**
 * Parse AI-generated JSON that may be wrapped in markdown code fences.
 * Strips ```json ... ``` fencing, then falls back to extracting the
 * first { … } or [ … ] substring if the initial parse fails.
 */
export function parseAIJson<T = unknown>(text: string): T {
  let cleaned = text.trim()

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
  cleaned = cleaned.trim()

  try {
    return JSON.parse(cleaned) as T
  } catch {
    // Fallback: find the first { and last } and parse that substring
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T
    }
    // Try array
    const firstBracket = cleaned.indexOf('[')
    const lastBracket = cleaned.lastIndexOf(']')
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1)) as T
    }
    throw new Error(`Failed to parse AI JSON response: ${cleaned.slice(0, 200)}`)
  }
}
