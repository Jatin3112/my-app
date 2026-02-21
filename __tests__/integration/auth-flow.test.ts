import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock DB
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    query: {
      users: { findFirst: vi.fn() },
      subscriptions: { findFirst: vi.fn() },
      passwordResetTokens: { findFirst: vi.fn().mockResolvedValue(null) },
    },
  },
}))

vi.mock("@/lib/db/schema", () => ({
  users: { id: "id", email: "email", password: "password", email_verified: "email_verified" },
  workspaces: { id: "id" },
  workspaceMembers: { workspace_id: "workspace_id" },
  subscriptions: { id: "id", workspace_id: "workspace_id", status: "status" },
  passwordResetTokens: { token_hash: "token_hash" },
  plans: {},
}))

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

describe("Auth flow integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rate limiter blocks after max login attempts", async () => {
    const { rateLimit, resetRateLimits } = await import("@/lib/api/rate-limit")
    resetRateLimits()

    // Simulate 10 login attempts
    for (let i = 0; i < 10; i++) {
      rateLimit("login:test-ip", 10, 900000)
    }

    const result = rateLimit("login:test-ip", 10, 900000)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("rate limiter allows requests within limit", async () => {
    const { rateLimit, resetRateLimits } = await import("@/lib/api/rate-limit")
    resetRateLimits()

    const result = rateLimit("login:fresh-ip", 10, 900000)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(9)
  })

  it("rate limiter isolates different keys", async () => {
    const { rateLimit, resetRateLimits } = await import("@/lib/api/rate-limit")
    resetRateLimits()

    // Exhaust one key
    for (let i = 0; i < 5; i++) {
      rateLimit("register:ip-a", 5, 3600000)
    }
    expect(rateLimit("register:ip-a", 5, 3600000).success).toBe(false)

    // Different key should still work
    expect(rateLimit("register:ip-b", 5, 3600000).success).toBe(true)
  })

  it("sanitizeText strips HTML tags from input", async () => {
    const { sanitizeText } = await import("@/lib/api/sanitize")
    expect(sanitizeText("<b>Bold</b> text")).toBe("Bold text")
    expect(sanitizeText('<a href="evil">click</a>')).toBe("click")
  })

  it("sanitizeHtml removes script tags but keeps safe HTML", async () => {
    const { sanitizeHtml } = await import("@/lib/api/sanitize")
    const input = '<p>Hello</p><script>alert("xss")</script>'
    expect(sanitizeHtml(input)).toBe("<p>Hello</p>")
  })

  it("isAdmin rejects non-admin emails", async () => {
    process.env.ADMIN_EMAILS = "admin@voicetask.app"
    const { isAdmin } = await import("@/lib/api/admin")
    expect(await isAdmin("hacker@evil.com")).toBe(false)
  })

  it("isAdmin accepts admin emails", async () => {
    process.env.ADMIN_EMAILS = "admin@voicetask.app"
    const { isAdmin } = await import("@/lib/api/admin")
    expect(await isAdmin("admin@voicetask.app")).toBe(true)
  })

  it("password reset token validation returns invalid for unknown tokens", async () => {
    const { validateResetToken } = await import("@/lib/api/password-reset")
    const result = await validateResetToken("fake-token")
    expect(result.valid).toBe(false)
  })

  it("auditLog outputs structured event to console", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {})
    const { auditLog } = await import("@/lib/api/audit")

    auditLog({
      action: "user.login",
      userId: "user-1",
      workspaceId: "ws-1",
      ip: "192.168.1.1",
    })

    expect(spy).toHaveBeenCalledWith(
      "[AUDIT]",
      expect.objectContaining({
        action: "user.login",
        userId: "user-1",
        timestamp: expect.any(String),
      })
    )
    spy.mockRestore()
  })
})
