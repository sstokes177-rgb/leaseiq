/**
 * Simple in-memory rate limiter for AI-powered API routes.
 * Prevents excessive calls per user per route.
 */

const rateLimitMap = new Map<string, number>()

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, ts] of rateLimitMap) {
    if (now - ts > 60_000) rateLimitMap.delete(key)
  }
}, 5 * 60 * 1000)

/**
 * Returns true if the request should be rate-limited (rejected).
 * @param userId - The authenticated user's ID
 * @param route  - Route identifier (e.g. "chat", "risk-score")
 * @param cooldownMs - Minimum milliseconds between calls (default 3000)
 */
export function isRateLimited(userId: string, route: string, cooldownMs = 3000): boolean {
  const key = `${userId}:${route}`
  const last = rateLimitMap.get(key)
  const now = Date.now()

  if (last && now - last < cooldownMs) {
    return true
  }

  rateLimitMap.set(key, now)
  return false
}
