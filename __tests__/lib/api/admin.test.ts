import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    query: {
      subscriptions: { findFirst: vi.fn() },
    },
  },
}))

vi.mock("@/lib/db/schema", () => ({
  users: { id: "id" },
  workspaces: { id: "id", name: "name", slug: "slug", owner_id: "owner_id", created_at: "created_at" },
  workspaceMembers: { workspace_id: "workspace_id" },
  subscriptions: { id: "id", workspace_id: "workspace_id", status: "status" },
  plans: { price_inr: "price_inr" },
}))

import { isAdmin, getAdminStats, extendTrial, changeWorkspacePlan } from "@/lib/api/admin"
import { db } from "@/lib/db"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("isAdmin", () => {
  it("returns true for whitelisted email", () => {
    process.env.ADMIN_EMAILS = "admin@test.com,boss@test.com"
    expect(isAdmin("admin@test.com")).toBe(true)
  })

  it("returns true for second whitelisted email", () => {
    process.env.ADMIN_EMAILS = "admin@test.com,boss@test.com"
    expect(isAdmin("boss@test.com")).toBe(true)
  })

  it("returns false for non-whitelisted email", () => {
    process.env.ADMIN_EMAILS = "admin@test.com"
    expect(isAdmin("hacker@test.com")).toBe(false)
  })

  it("returns false when ADMIN_EMAILS not set", () => {
    delete process.env.ADMIN_EMAILS
    expect(isAdmin("admin@test.com")).toBe(false)
  })

  it("trims whitespace from email list", () => {
    process.env.ADMIN_EMAILS = "admin@test.com , boss@test.com"
    expect(isAdmin("boss@test.com")).toBe(true)
  })
})

describe("getAdminStats", () => {
  it("returns stats object with correct counts", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ count: 42 }]) } as any)
      .mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ count: 5 }]) } as any)
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: 3 }]) }) } as any)
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: 2 }]) }) } as any)

    const stats = await getAdminStats()
    expect(stats).toEqual({
      totalUsers: 42,
      totalWorkspaces: 5,
      activeTrials: 3,
      activeSubscriptions: 2,
    })
  })

  it("returns zeros when no data", async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ count: 0 }]) } as any)
      .mockReturnValueOnce({ from: vi.fn().mockResolvedValue([{ count: 0 }]) } as any)
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: 0 }]) }) } as any)
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: 0 }]) }) } as any)

    const stats = await getAdminStats()
    expect(stats.totalUsers).toBe(0)
    expect(stats.totalWorkspaces).toBe(0)
    expect(stats.activeTrials).toBe(0)
    expect(stats.activeSubscriptions).toBe(0)
  })
})

describe("extendTrial", () => {
  it("extends trial by specified days", async () => {
    const trialEnd = new Date("2026-03-01T00:00:00Z")
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
    vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue({
      id: "sub-1",
      workspace_id: "ws-1",
      plan_id: "plan-1",
      status: "trialing",
      trial_start: new Date("2026-02-15T00:00:00Z"),
      trial_end: trialEnd,
      current_period_start: null,
      current_period_end: null,
      payment_provider: null,
      provider_subscription_id: null,
      cancel_at_period_end: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any)

    const result = await extendTrial("ws-1", 7)
    expect(result.success).toBe(true)
    expect(result.newTrialEnd).toEqual(new Date("2026-03-08T00:00:00Z"))
    expect(db.update).toHaveBeenCalled()
  })

  it("throws when no subscription found", async () => {
    vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(undefined)
    await expect(extendTrial("ws-missing", 7)).rejects.toThrow("No subscription found")
  })
})

describe("changeWorkspacePlan", () => {
  it("changes plan successfully", async () => {
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
    vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue({
      id: "sub-1",
      workspace_id: "ws-1",
      plan_id: "plan-old",
      status: "active",
      trial_start: null,
      trial_end: null,
      current_period_start: null,
      current_period_end: null,
      payment_provider: null,
      provider_subscription_id: null,
      cancel_at_period_end: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any)

    const result = await changeWorkspacePlan("ws-1", "plan-new")
    expect(result.success).toBe(true)
    expect(db.update).toHaveBeenCalled()
  })

  it("throws when no subscription found", async () => {
    vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(undefined)
    await expect(changeWorkspacePlan("ws-missing", "plan-new")).rejects.toThrow("No subscription found")
  })
})
