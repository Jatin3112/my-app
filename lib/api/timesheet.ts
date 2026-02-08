"use server"

import { db } from '../db'
import { timesheetEntries, type TimesheetEntry, type NewTimesheetEntry } from '../db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { requirePermission, getMemberRole } from '@/lib/auth/permissions'

export async function getTimesheetEntries(workspaceId: string, userId: string, startDate?: string, endDate?: string): Promise<TimesheetEntry[]> {
  const role = await getMemberRole(userId, workspaceId)
  if (!role) throw new Error("Not a member of this workspace")
  const conditions = [eq(timesheetEntries.workspace_id, workspaceId)]
  if (role === "member") {
    conditions.push(eq(timesheetEntries.user_id, userId))
  }
  if (startDate) conditions.push(gte(timesheetEntries.date, startDate))
  if (endDate) conditions.push(lte(timesheetEntries.date, endDate))
  const data = await db.query.timesheetEntries.findMany({
    where: and(...conditions),
    orderBy: [desc(timesheetEntries.date), desc(timesheetEntries.created_at)],
  })
  return data
}

export async function createTimesheetEntry(workspaceId: string, userId: string, entry: Omit<NewTimesheetEntry, 'user_id' | 'workspace_id'>): Promise<TimesheetEntry> {
  const role = await getMemberRole(userId, workspaceId)
  if (!role) throw new Error("Not a member of this workspace")
  const [data] = await db.insert(timesheetEntries)
    .values({
      ...entry,
      user_id: userId,
      workspace_id: workspaceId,
      updated_at: new Date()
    } as any)
    .returning()
  return data
}

export async function updateTimesheetEntry(workspaceId: string, userId: string, id: string, entry: Partial<NewTimesheetEntry>): Promise<TimesheetEntry> {
  const existing = await db.query.timesheetEntries.findFirst({ where: eq(timesheetEntries.id, id) })
  if (!existing) throw new Error("Entry not found")
  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "timesheet:edit_any")
  }
  const [data] = await db.update(timesheetEntries)
    .set({ ...entry, updated_at: new Date() } as any)
    .where(eq(timesheetEntries.id, id))
    .returning()
  return data
}

export async function deleteTimesheetEntry(workspaceId: string, userId: string, id: string): Promise<void> {
  const existing = await db.query.timesheetEntries.findFirst({ where: eq(timesheetEntries.id, id) })
  if (!existing) throw new Error("Entry not found")
  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "timesheet:delete_any")
  }
  await db.delete(timesheetEntries).where(eq(timesheetEntries.id, id))
}
