import { describe, it, expect, beforeEach } from "vitest"
import { rateLimit, resetRateLimits } from "@/lib/api/rate-limit"

describe("Auth rate limiting", () => {
  beforeEach(() => { resetRateLimits() })

  it("allows normal login attempts", () => {
    for (let i = 0; i < 10; i++) {
      expect(rateLimit("login:test-ip", 10, 900000).success).toBe(true)
    }
  })

  it("blocks excessive login attempts", () => {
    for (let i = 0; i < 10; i++) rateLimit("login:test-ip", 10, 900000)
    expect(rateLimit("login:test-ip", 10, 900000).success).toBe(false)
  })

  it("allows normal register attempts", () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit("register:test-ip", 5, 3600000).success).toBe(true)
    }
  })

  it("blocks excessive register attempts", () => {
    for (let i = 0; i < 5; i++) rateLimit("register:test-ip", 5, 3600000)
    expect(rateLimit("register:test-ip", 5, 3600000).success).toBe(false)
  })

  it("blocks excessive password reset attempts", () => {
    for (let i = 0; i < 3; i++) rateLimit("forgot:test-ip", 3, 900000)
    expect(rateLimit("forgot:test-ip", 3, 900000).success).toBe(false)
  })
})
