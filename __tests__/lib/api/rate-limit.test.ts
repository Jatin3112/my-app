import { describe, it, expect, vi, beforeEach } from "vitest"
import { rateLimit, resetRateLimits } from "@/lib/api/rate-limit"

beforeEach(() => {
  resetRateLimits()
})

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const result = rateLimit("test-key", 5, 60000)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it("blocks requests over the limit", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("block-key", 5, 60000)
    }
    const result = rateLimit("block-key", 5, 60000)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("tracks different keys independently", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit("key-a", 5, 60000)
    }
    const result = rateLimit("key-b", 5, 60000)
    expect(result.success).toBe(true)
  })

  it("resets after window expires", () => {
    vi.useFakeTimers()
    for (let i = 0; i < 5; i++) {
      rateLimit("expire-key", 5, 1000)
    }
    expect(rateLimit("expire-key", 5, 1000).success).toBe(false)
    vi.advanceTimersByTime(1001)
    expect(rateLimit("expire-key", 5, 1000).success).toBe(true)
    vi.useRealTimers()
  })

  it("returns resetAt timestamp", () => {
    const result = rateLimit("reset-key", 5, 60000)
    expect(result.resetAt).toBeGreaterThan(Date.now())
  })
})
