/**
 * Sliding-window in-memory rate limiter for AI-powered API routes.
 * Tracks request counts per user per route within a configurable time window.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimits = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(key)
  }
}, 5 * 60 * 1000)

/** Per-route rate limit configuration: [maxRequests, windowMs] */
const ROUTE_LIMITS: Record<string, [number, number]> = {
  'chat':               [30, 60_000],  // 30 per minute
  'risk-score':         [5,  60_000],  // 5 per minute
  'cam-audit':          [5,  60_000],
  'lease-compare':      [5,  60_000],
  'lease-summary':      [5,  60_000],
  'obligations':        [5,  60_000],
  'lease-clauses':      [5,  60_000],
  'cam-reconciliation': [5,  60_000],
  'percentage-rent':    [5,  60_000],
  'rent-escalation':    [5,  60_000],
  'upload':             [10, 60_000],  // 10 per minute
}

/**
 * Returns true if the request should be rate-limited (rejected).
 * Uses a sliding window counter per user+route.
 *
 * @param userId - The authenticated user's ID
 * @param route  - Route identifier (e.g. "chat", "risk-score")
 */
export function isRateLimited(userId: string, route: string): boolean {
  const [limit, windowMs] = ROUTE_LIMITS[route] ?? [10, 60_000]
  const key = `${userId}:${route}`
  const now = Date.now()
  const entry = rateLimits.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  if (entry.count >= limit) {
    return true // Rate limited
  }

  entry.count++
  return false
}
