const store = new Map<string, number[]>()

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const windowStart = now - windowMs

  const timestamps = store.get(key) || []
  const recent = timestamps.filter((t) => t > windowStart)

  if (recent.length >= maxRequests) {
    store.set(key, recent)
    return {
      success: false,
      remaining: 0,
      resetAt: recent[0] + windowMs,
    }
  }

  recent.push(now)
  store.set(key, recent)

  return {
    success: true,
    remaining: maxRequests - recent.length,
    resetAt: recent[0] + windowMs,
  }
}

export function resetRateLimits(): void {
  store.clear()
}
