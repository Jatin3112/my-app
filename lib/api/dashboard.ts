"use server"

import { db } from "@/lib/db"
import { projects, todos, timesheetEntries, workspaceMembers } from "@/lib/db/schema"
import { eq, and, count, sum, gte, lte } from "drizzle-orm"
import { cached } from "@/lib/cache"

export type DashboardStats = {
  totalProjects: number
  totalTodos: number
  completedTodos: number
  pendingTodos: number
  totalHoursLogged: number
  thisWeekHours: number
  totalMembers: number
}

function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() - dayOfWeek)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  }
}

export async function getDashboardStats(workspaceId: string): Promise<DashboardStats> {
  return cached(`stats:${workspaceId}`, 60, async () => {
    const week = getWeekRange()

    const [projectCount, todoCount, completedCount, totalHours, weekHours, memberCount] =
      await Promise.all([
        db.select({ count: count() }).from(projects).where(eq(projects.workspace_id, workspaceId)),
        db.select({ count: count() }).from(todos).where(eq(todos.workspace_id, workspaceId)),
        db.select({ count: count() }).from(todos).where(and(eq(todos.workspace_id, workspaceId), eq(todos.completed, true))),
        db.select({ total: sum(timesheetEntries.hours) }).from(timesheetEntries).where(eq(timesheetEntries.workspace_id, workspaceId)),
        db.select({ total: sum(timesheetEntries.hours) }).from(timesheetEntries).where(
          and(eq(timesheetEntries.workspace_id, workspaceId), gte(timesheetEntries.date, week.start), lte(timesheetEntries.date, week.end))
        ),
        db.select({ count: count() }).from(workspaceMembers).where(eq(workspaceMembers.workspace_id, workspaceId)),
      ])

    const totalTodos = todoCount[0].count
    const completed = completedCount[0].count

    return {
      totalProjects: projectCount[0].count,
      totalTodos,
      completedTodos: completed,
      pendingTodos: totalTodos - completed,
      totalHoursLogged: Number(totalHours[0].total) || 0,
      thisWeekHours: Number(weekHours[0].total) || 0,
      totalMembers: memberCount[0].count,
    }
  })
}
