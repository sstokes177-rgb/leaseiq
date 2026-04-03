/**
 * Parse AI-generated JSON that may be wrapped in markdown code fences.
 * Strips ```json ... ``` fencing, then falls back to extracting the
 * first { … } substring if the initial parse fails.
 */
export function parseAIJson<T = unknown>(text: string): T {
  let cleaned = text.trim()

  // Strip markdown code fencing
  if (cleaned.startsWith('`')) {
    cleaned = cleaned.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')
  }

  try {
    return JSON.parse(cleaned)
  } catch {
    // Fallback: find the first { and last } and parse that substring
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1))
    }
    throw new Error('Could not parse AI JSON response')
  }
}
