"use server"

import { db } from '../db'
import { timesheetEntries, type TimesheetEntry, type NewTimesheetEntry } from '../db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'

export async function getTimesheetEntries(user_id: string, startDate?: string, endDate?: string): Promise<TimesheetEntry[]> {
  const conditions = [eq(timesheetEntries.user_id, user_id)]

  if (startDate) {
    conditions.push(gte(timesheetEntries.date, startDate))
  }

  if (endDate) {
    conditions.push(lte(timesheetEntries.date, endDate))
  }

  const data = await db.query.timesheetEntries.findMany({
    where: and(...conditions),
    orderBy: [desc(timesheetEntries.date), desc(timesheetEntries.created_at)],
  })

  return data
}

export async function createTimesheetEntry(user_id: string, entry: Omit<NewTimesheetEntry, 'user_id'>): Promise<TimesheetEntry> {
  const [data] = await db.insert(timesheetEntries)
    .values({ 
      ...entry, 
      user_id, 
      updated_at: new Date() 
    } as any)
    .returning()

  return data
}

export async function updateTimesheetEntry(id: string, entry: Partial<NewTimesheetEntry>): Promise<TimesheetEntry> {
  const [data] = await db.update(timesheetEntries)
    .set({ 
      ...entry, 
      updated_at: new Date() 
    } as any)
    .where(eq(timesheetEntries.id, id))
    .returning()

  return data
}

export async function deleteTimesheetEntry(id: string): Promise<void> {
  await db.delete(timesheetEntries).where(eq(timesheetEntries.id, id))
}
