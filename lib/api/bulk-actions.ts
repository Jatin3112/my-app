"use server"

import { db } from "@/lib/db"
import { todos, timesheetEntries } from "@/lib/db/schema"
import { inArray } from "drizzle-orm"
import { cacheDel } from "@/lib/cache"

export async function bulkDeleteTodos(ids: string[], workspaceId?: string): Promise<void> {
  if (ids.length === 0) return
  await db.delete(todos).where(inArray(todos.id, ids))
  if (workspaceId) await cacheDel(`stats:${workspaceId}`)
}

export async function bulkToggleTodos(ids: string[], completed: boolean, workspaceId?: string): Promise<void> {
  if (ids.length === 0) return
  await db
    .update(todos)
    .set({ completed, updated_at: new Date() })
    .where(inArray(todos.id, ids))
  if (workspaceId) await cacheDel(`stats:${workspaceId}`)
}

export async function bulkDeleteTimesheetEntries(ids: string[], workspaceId?: string): Promise<void> {
  if (ids.length === 0) return
  await db.delete(timesheetEntries).where(inArray(timesheetEntries.id, ids))
  if (workspaceId) await cacheDel(`stats:${workspaceId}`)
}
