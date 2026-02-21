import { describe, it, expect } from "vitest"
import { getNextDueDate, shouldGenerateNextOccurrence } from "@/lib/api/recurrence"

describe("getNextDueDate", () => {
  it("adds 1 day for daily", () => {
    expect(getNextDueDate("2026-02-15", "daily")).toBe("2026-02-16")
  })

  it("adds 7 days for weekly", () => {
    expect(getNextDueDate("2026-02-15", "weekly")).toBe("2026-02-22")
  })

  it("adds 1 month for monthly", () => {
    expect(getNextDueDate("2026-01-31", "monthly")).toBe("2026-02-28")
  })

  it("handles year boundary", () => {
    expect(getNextDueDate("2026-12-28", "weekly")).toBe("2027-01-04")
  })
})

describe("shouldGenerateNextOccurrence", () => {
  it("returns true when no end date", () => {
    expect(shouldGenerateNextOccurrence("2026-03-01", null)).toBe(true)
  })

  it("returns true when next date is before end date", () => {
    expect(shouldGenerateNextOccurrence("2026-03-01", "2026-12-31")).toBe(true)
  })

  it("returns true when next date equals end date", () => {
    expect(shouldGenerateNextOccurrence("2026-03-01", "2026-03-01")).toBe(true)
  })

  it("returns false when next date is after end date", () => {
    expect(shouldGenerateNextOccurrence("2026-04-01", "2026-03-31")).toBe(false)
  })
})
