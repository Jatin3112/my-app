import { describe, it, expect, vi, beforeEach } from "vitest"
import { auditLog, type AuditEvent } from "@/lib/api/audit"

describe("auditLog", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {})
  })

  it("logs audit event to console", () => {
    const event: AuditEvent = {
      action: "todo.create",
      userId: "user-1",
      workspaceId: "ws-1",
      resourceId: "todo-1",
      metadata: { title: "Test todo" },
    }
    auditLog(event)
    expect(console.info).toHaveBeenCalledWith(
      "[AUDIT]",
      expect.objectContaining({
        action: "todo.create",
        userId: "user-1",
      })
    )
  })

  it("includes timestamp", () => {
    auditLog({ action: "user.login", userId: "user-1" })
    expect(console.info).toHaveBeenCalledWith(
      "[AUDIT]",
      expect.objectContaining({
        timestamp: expect.any(String),
      })
    )
  })

  it("handles missing optional fields", () => {
    auditLog({ action: "system.startup", userId: "system" })
    expect(console.info).toHaveBeenCalledWith(
      "[AUDIT]",
      expect.objectContaining({ action: "system.startup" })
    )
  })
})
