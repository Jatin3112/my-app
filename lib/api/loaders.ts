"use server"

import { db } from "@/lib/db"
import {
  todos,
  projects,
  timesheetEntries,
  workspaces,
  workspaceMembers,
  type Todo,
  type Project,
  type TimesheetEntry,
} from "@/lib/db/schema"
import { eq, and, asc, count, sum, gte, lte, lt, desc, sql } from "drizzle-orm"
import { getMemberRole, type Role } from "@/lib/auth/permissions"
import { cached } from "@/lib/cache"
import { cacheDel } from "@/lib/cache"
import { createTrialSubscription } from "./subscriptions"
import { getOnboardingStatus, type OnboardingStatus } from "@/lib/api/onboarding"

// ---------------------------------------------------------------------------
// Dashboard: stats + projects + charts + activity in a single server action
// ---------------------------------------------------------------------------

export type DashboardData = {
  stats: {
    totalProjects: number
    totalTodos: number
    completedTodos: number
    pendingTodos: number
    totalHoursLogged: number
    thisWeekHours: number
    totalMembers: number
    overdueTodos: number
    dueTodayTodos: number
  }
  projects: Project[]
  chartData: {
    hoursByProject: { project: string; hours: number }[]
    dailyHours: { date: string; hours: number }[]
  }
  recentActivity: {
    type: "todo" | "timesheet"
    title: string
    detail: string
    timestamp: Date
  }[]
  projectProgress: {
    id: string
    name: string
    totalTodos: number
    completedTodos: number
  }[]
  onboarding?: OnboardingStatus
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

function getLast7Days(): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    days.push(d.toISOString().split("T")[0])
  }
  return days
}

export async function loadDashboardData(
  workspaceId: string,
  userId: string,
): Promise<DashboardData> {
  const role = await getMemberRole(userId, workspaceId)
  if (!role) throw new Error("Not a member of this workspace")

  const week = getWeekRange()
  const last7Days = getLast7Days()
  const sevenDaysAgo = last7Days[0]

  const [
    stats,
    projectList,
    hoursByProject,
    dailyHoursRaw,
    recentTodos,
    recentTimesheet,
    projectTodoCounts,
  ] = await Promise.all([
    // Existing stats
    cached(`stats:${workspaceId}`, 60, async () => {
      const today = new Date().toISOString().split("T")[0]
      const [projectCount, todoCount, completedCount, totalHours, weekHours, memberCount, overdueCount, dueTodayCount] =
        await Promise.all([
          db.select({ count: count() }).from(projects).where(eq(projects.workspace_id, workspaceId)),
          db.select({ count: count() }).from(todos).where(eq(todos.workspace_id, workspaceId)),
          db.select({ count: count() }).from(todos).where(and(eq(todos.workspace_id, workspaceId), eq(todos.completed, true))),
          db.select({ total: sum(timesheetEntries.hours) }).from(timesheetEntries).where(eq(timesheetEntries.workspace_id, workspaceId)),
          db.select({ total: sum(timesheetEntries.hours) }).from(timesheetEntries).where(
            and(eq(timesheetEntries.workspace_id, workspaceId), gte(timesheetEntries.date, week.start), lte(timesheetEntries.date, week.end)),
          ),
          db.select({ count: count() }).from(workspaceMembers).where(eq(workspaceMembers.workspace_id, workspaceId)),
          db.select({ count: count() }).from(todos).where(
            and(eq(todos.workspace_id, workspaceId), eq(todos.completed, false), lt(todos.due_date, today))
          ),
          db.select({ count: count() }).from(todos).where(
            and(eq(todos.workspace_id, workspaceId), eq(todos.completed, false), eq(todos.due_date, today))
          ),
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
        overdueTodos: overdueCount[0].count,
        dueTodayTodos: dueTodayCount[0].count,
      }
    }),

    // Projects
    cached(`projects:${workspaceId}`, 300, async () => {
      return db.query.projects.findMany({
        where: eq(projects.workspace_id, workspaceId),
      })
    }),

    // Hours by project (top 6)
    db.select({
      project: timesheetEntries.project_name,
      hours: sum(timesheetEntries.hours).as("total_hours"),
    })
      .from(timesheetEntries)
      .where(eq(timesheetEntries.workspace_id, workspaceId))
      .groupBy(timesheetEntries.project_name)
      .orderBy(desc(sql`total_hours`))
      .limit(6),

    // Daily hours (last 7 days)
    db.select({
      date: timesheetEntries.date,
      hours: sum(timesheetEntries.hours).as("total_hours"),
    })
      .from(timesheetEntries)
      .where(
        and(
          eq(timesheetEntries.workspace_id, workspaceId),
          gte(timesheetEntries.date, sevenDaysAgo),
        ),
      )
      .groupBy(timesheetEntries.date)
      .orderBy(asc(timesheetEntries.date)),

    // Recent todos (latest 5)
    db.query.todos.findMany({
      where: eq(todos.workspace_id, workspaceId),
      orderBy: [desc(todos.created_at)],
      limit: 5,
      with: { project: true },
    }),

    // Recent timesheet entries (latest 5)
    db.query.timesheetEntries.findMany({
      where: eq(timesheetEntries.workspace_id, workspaceId),
      orderBy: [desc(timesheetEntries.created_at)],
      limit: 5,
    }),

    // Per-project todo counts
    db.select({
      projectId: projects.id,
      projectName: projects.name,
      totalTodos: count(todos.id).as("total_todos"),
      completedTodos: sum(
        sql`CASE WHEN ${todos.completed} = true THEN 1 ELSE 0 END`
      ).as("completed_todos"),
    })
      .from(projects)
      .leftJoin(todos, eq(todos.project_id, projects.id))
      .where(eq(projects.workspace_id, workspaceId))
      .groupBy(projects.id, projects.name),
  ])

  // Build chart data
  const chartData = {
    hoursByProject: hoursByProject.map((row) => ({
      project: row.project,
      hours: Number(row.hours) || 0,
    })),
    dailyHours: (() => {
      const hoursMap = new Map<string, number>()
      for (const row of dailyHoursRaw) {
        hoursMap.set(row.date, Number(row.hours) || 0)
      }
      return last7Days.map((date) => ({
        date,
        hours: hoursMap.get(date) || 0,
      }))
    })(),
  }

  // Build recent activity (merge & sort, take top 8)
  const recentActivity = [
    ...recentTodos.map((t) => ({
      type: "todo" as const,
      title: t.title,
      detail: (t as unknown as { project?: { name: string } }).project?.name || "No project",
      timestamp: t.created_at,
    })),
    ...recentTimesheet.map((e) => ({
      type: "timesheet" as const,
      title: e.task_description,
      detail: `${e.hours}h · ${e.project_name}`,
      timestamp: e.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8)

  // Build project progress
  const projectProgress = projectTodoCounts.map((row) => ({
    id: row.projectId,
    name: row.projectName,
    totalTodos: Number(row.totalTodos) || 0,
    completedTodos: Number(row.completedTodos) || 0,
  }))

  // Load onboarding status
  const onboarding = await getOnboardingStatus(userId)

  return { stats, projects: projectList, chartData, recentActivity, projectProgress, onboarding }
}

// ---------------------------------------------------------------------------
// Todos page: todos + projects in a single server action
// ---------------------------------------------------------------------------

export type TodoPageData = {
  todos: Todo[]
  projects: Project[]
}

export async function loadTodoPageData(
  workspaceId: string,
  userId: string,
): Promise<TodoPageData> {
  const role = await getMemberRole(userId, workspaceId)
  if (!role) throw new Error("Not a member of this workspace")

  // Fetch todos and projects in parallel — single permission check
  const [todoList, projectList] = await Promise.all([
    db.query.todos.findMany({
      where: eq(todos.workspace_id, workspaceId),
      orderBy: [asc(todos.sort_order), asc(todos.created_at)],
    }),
    cached(`projects:${workspaceId}`, 300, async () => {
      return db.query.projects.findMany({
        where: eq(projects.workspace_id, workspaceId),
      })
    }),
  ])

  return { todos: todoList, projects: projectList }
}

// ---------------------------------------------------------------------------
// Timesheet page: entries + projects in a single server action
// ---------------------------------------------------------------------------

export type TimesheetPageData = {
  entries: TimesheetEntry[]
  projects: Project[]
}

export async function loadTimesheetPageData(
  workspaceId: string,
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<TimesheetPageData> {
  const role = await getMemberRole(userId, workspaceId)
  if (!role) throw new Error("Not a member of this workspace")

  const conditions = [eq(timesheetEntries.workspace_id, workspaceId)]
  if (role === "member") {
    conditions.push(eq(timesheetEntries.user_id, userId))
  }
  if (startDate) conditions.push(gte(timesheetEntries.date, startDate))
  if (endDate) conditions.push(lte(timesheetEntries.date, endDate))

  // Fetch entries and projects in parallel — single permission check
  const [entryList, projectList] = await Promise.all([
    db.query.timesheetEntries.findMany({
      where: and(...conditions),
      orderBy: [desc(timesheetEntries.date), desc(timesheetEntries.created_at)],
    }),
    cached(`projects:${workspaceId}`, 300, async () => {
      return db.query.projects.findMany({
        where: eq(projects.workspace_id, workspaceId),
      })
    }),
  ])

  return { entries: entryList, projects: projectList }
}

// ---------------------------------------------------------------------------
// Home page: workspaces + dashboard data in a single server action
// ---------------------------------------------------------------------------

export type WorkspaceWithRole = {
  id: string
  name: string
  slug: string
  owner_id: string
  role: string
  created_at: Date
  updated_at: Date
}

export type HomePageData = {
  workspaces: WorkspaceWithRole[]
  currentWorkspace: WorkspaceWithRole
} & DashboardData

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const suffix = Math.random().toString(36).substring(2, 8)
  return `${base}-${suffix}`
}

export async function loadHomePageData(
  userId: string,
  userName: string,
  lastWorkspaceId?: string,
): Promise<HomePageData> {
  // 1. Get workspace memberships
  const memberships = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.user_id, userId),
    with: { workspace: true },
  })

  let wsData: WorkspaceWithRole[] = memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }))

  // 2. Auto-create default workspace for first-time users
  if (wsData.length === 0) {
    const slug = generateSlug(`${userName}'s Workspace`)
    const [newWs] = await db
      .insert(workspaces)
      .values({ name: `${userName}'s Workspace`, slug, owner_id: userId })
      .returning()

    await db.insert(workspaceMembers).values({
      workspace_id: newWs.id,
      user_id: userId,
      role: "owner",
    })

    await createTrialSubscription(newWs.id)

    await cacheDel(`workspaces:${userId}`)

    wsData = [{ ...newWs, role: "owner" }]
  }

  // 3. Pick current workspace
  const current = lastWorkspaceId
    ? wsData.find((w) => w.id === lastWorkspaceId) || wsData[0]
    : wsData[0]

  // 4. Load dashboard data for the selected workspace
  const dashboardData = await loadDashboardData(current.id, userId)

  return { workspaces: wsData, currentWorkspace: current, ...dashboardData }
}
