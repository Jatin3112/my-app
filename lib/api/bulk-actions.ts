"use server"

import { db } from "@/lib/db"
import { todos, timesheetEntries } from "@/lib/db/schema"
import { inArray } from "drizzle-orm"
import { cacheDel } from "@/lib/cache"
import { requirePermission } from "@/lib/auth/permissions"

export async function bulkDeleteTodos(ids: string[], workspaceId: string, userId: string): Promise<void> {
  if (ids.length === 0) return
  await requirePermission(workspaceId, userId, "todo:delete_any")
  await db.delete(todos).where(inArray(todos.id, ids))
  await cacheDel(`stats:${workspaceId}`)
}

export async function bulkToggleTodos(ids: string[], completed: boolean, workspaceId: string, userId: string): Promise<void> {
  if (ids.length === 0) return
  await requirePermission(workspaceId, userId, "todo:edit_any")
  await db
    .update(todos)
    .set({ completed, updated_at: new Date() })
    .where(inArray(todos.id, ids))
  await cacheDel(`stats:${workspaceId}`)
}

export async function bulkDeleteTimesheetEntries(ids: string[], workspaceId: string, userId: string): Promise<void> {
  if (ids.length === 0) return
  await requirePermission(workspaceId, userId, "timesheet:delete_any")
  await db.delete(timesheetEntries).where(inArray(timesheetEntries.id, ids))
  await cacheDel(`stats:${workspaceId}`)
}
