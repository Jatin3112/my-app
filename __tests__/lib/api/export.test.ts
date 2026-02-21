import { describe, it, expect } from "vitest"
import { generateTimesheetCSV, generateTimesheetPDF } from "@/lib/api/export"

const mockEntries = [
  {
    id: "1",
    user_id: "u1",
    workspace_id: "w1",
    date: "2026-02-15",
    project_name: "Acme Website",
    task_description: "Homepage redesign",
    hours: 3.5,
    notes: "Finished hero section",
    created_at: new Date("2026-02-15"),
    updated_at: new Date("2026-02-15"),
  },
  {
    id: "2",
    user_id: "u1",
    workspace_id: "w1",
    date: "2026-02-16",
    project_name: "Internal Tools",
    task_description: "Bug fixes",
    hours: 2,
    notes: null,
    created_at: new Date("2026-02-16"),
    updated_at: new Date("2026-02-16"),
  },
] as any

describe("generateTimesheetCSV", () => {
  it("generates valid CSV with headers", () => {
    const csv = generateTimesheetCSV(mockEntries)
    const lines = csv.split("\n")
    expect(lines[0]).toBe("Date,Project,Task,Hours,Notes")
  })

  it("includes all entries plus total row", () => {
    const csv = generateTimesheetCSV(mockEntries)
    const lines = csv.split("\n").filter((l) => l.trim())
    expect(lines.length).toBe(4) // header + 2 entries + total
  })

  it("handles null notes", () => {
    const csv = generateTimesheetCSV(mockEntries)
    expect(csv).toContain("Bug fixes,2,")
  })

  it("escapes commas in fields", () => {
    const entries = [
      {
        ...mockEntries[0],
        task_description: "Fix header, footer, and nav",
      },
    ]
    const csv = generateTimesheetCSV(entries)
    expect(csv).toContain('"Fix header, footer, and nav"')
  })

  it("returns CSV with just headers and total for no entries", () => {
    const csv = generateTimesheetCSV([])
    const lines = csv.split("\n").filter((l) => l.trim())
    expect(lines[0]).toBe("Date,Project,Task,Hours,Notes")
    expect(lines).toContain("Total,,,0,")
  })

  it("calculates correct total hours", () => {
    const csv = generateTimesheetCSV(mockEntries)
    expect(csv).toContain("Total,,,5.5,")
  })
})

describe("generateTimesheetPDF", () => {
  it("returns an ArrayBuffer", () => {
    const result = generateTimesheetPDF(mockEntries, "Acme Corp", "Feb 15 - Feb 28, 2026")
    expect(result).toBeInstanceOf(ArrayBuffer)
  })

  it("returns non-empty output for entries", () => {
    const result = generateTimesheetPDF(mockEntries, "Acme Corp", "Feb 15 - Feb 28, 2026")
    expect(result.byteLength).toBeGreaterThan(0)
  })

  it("handles empty entries", () => {
    const result = generateTimesheetPDF([], "Acme Corp", "Feb 2026")
    expect(result).toBeInstanceOf(ArrayBuffer)
    expect(result.byteLength).toBeGreaterThan(0)
  })
})
