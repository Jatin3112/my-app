import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    query: { users: { findFirst: vi.fn() } },
    update: vi.fn(),
  },
}))

vi.mock("@/lib/db/schema", () => ({
  users: { id: "id", onboarding: "onboarding" },
}))

import { getOnboardingStatus, updateOnboardingStep, dismissOnboarding } from "@/lib/api/onboarding"
import { db } from "@/lib/db"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("getOnboardingStatus", () => {
  it("returns default status for new user", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      onboarding: {},
    } as any)

    const status = await getOnboardingStatus("u1")
    expect(status.completed).toBe(0)
    expect(status.total).toBe(4)
    expect(status.dismissed).toBe(false)
  })

  it("counts completed steps", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      onboarding: { created_project: true, added_todo: true },
    } as any)

    const status = await getOnboardingStatus("u1")
    expect(status.completed).toBe(2)
  })

  it("detects dismissed state", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      onboarding: { dismissed: true },
    } as any)

    const status = await getOnboardingStatus("u1")
    expect(status.dismissed).toBe(true)
  })
})

describe("updateOnboardingStep", () => {
  it("updates a specific step", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      onboarding: {},
    } as any)
    const mockWhere = vi.fn().mockResolvedValue(undefined)
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere })
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any)

    await updateOnboardingStep("u1", "created_project")
    expect(db.update).toHaveBeenCalled()
  })
})

describe("dismissOnboarding", () => {
  it("sets dismissed to true", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      onboarding: { created_project: true },
    } as any)
    const mockWhere = vi.fn().mockResolvedValue(undefined)
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere })
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any)

    await dismissOnboarding("u1")
    expect(db.update).toHaveBeenCalled()
  })
})
