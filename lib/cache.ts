import { Redis } from "@upstash/redis"

// ---------------------------------------------------------------------------
// Lazy-initialized Redis client (only created when first used)
// ---------------------------------------------------------------------------

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  redis = new Redis({ url, token })
  return redis
}

// ---------------------------------------------------------------------------
// Wrapper type — distinguishes a cached `null` from a cache miss
// ---------------------------------------------------------------------------

type CacheEntry<T> = { __cached: true; value: T }

// ---------------------------------------------------------------------------
// cached<T>(key, ttlSeconds, fetcher) — cache-aside in one call
// ---------------------------------------------------------------------------

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const r = getRedis()

  if (r) {
    try {
      const hit = await r.get<CacheEntry<T>>(key)
      if (hit && hit.__cached) return hit.value
    } catch {
      // Redis read failed — fall through to DB
    }
  }

  const value = await fetcher()

  if (r) {
    try {
      const entry: CacheEntry<T> = { __cached: true, value }
      await r.set(key, entry, { ex: ttlSeconds })
    } catch {
      // Redis write failed — non-fatal
    }
  }

  return value
}

// ---------------------------------------------------------------------------
// cacheDel(...keys) — delete specific cache keys
// ---------------------------------------------------------------------------

export async function cacheDel(...keys: string[]): Promise<void> {
  const r = getRedis()
  if (!r || keys.length === 0) return

  try {
    await r.del(...keys)
  } catch {
    // non-fatal
  }
}

// ---------------------------------------------------------------------------
// cacheInvalidate(pattern) — SCAN-based glob pattern deletion
// ---------------------------------------------------------------------------

export async function cacheInvalidate(pattern: string): Promise<void> {
  const r = getRedis()
  if (!r) return

  try {
    let cursor = 0
    do {
      const result = await r.scan(cursor, { match: pattern, count: 100 })
      cursor = Number(result[0])
      const keys = result[1] as string[]
      if (keys.length > 0) {
        await r.del(...keys)
      }
    } while (cursor !== 0)
  } catch {
    // non-fatal
  }
}
