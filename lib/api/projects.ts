"use server"

import { db } from '../db'
import { projects, users, type Project, type NewProject } from '../db/schema'
import { eq } from 'drizzle-orm'
import { requirePermission } from '@/lib/auth/permissions'
import { createNotification } from '@/lib/api/notifications'
import { cached, cacheDel } from '@/lib/cache'
import { canAddProject } from "./plan-enforcement"
import { updateOnboardingStep } from "@/lib/api/onboarding"

export async function getProjects(workspaceId: string, userId: string): Promise<Project[]> {
  await requirePermission(userId, workspaceId, "todo:view_all")
  return cached(`projects:${workspaceId}`, 300, async () => {
    const data = await db.query.projects.findMany({
      where: eq(projects.workspace_id, workspaceId),
    })
    return data
  })
}

export async function createProject(workspaceId: string, userId: string, project: Omit<NewProject, 'user_id' | 'workspace_id'>): Promise<Project> {
  await requirePermission(userId, workspaceId, "project:create")

  const projectCheck = await canAddProject(workspaceId);
  if (!projectCheck.allowed) throw new Error(projectCheck.reason);

  const [data] = await db.insert(projects)
    .values({
      ...project,
      user_id: userId,
      workspace_id: workspaceId,
      updated_at: new Date()
    } as any)
    .returning()

  await cacheDel(`projects:${workspaceId}`, `stats:${workspaceId}`)

  const actor = await db.query.users.findFirst({ where: eq(users.id, userId) })
  const actorName = actor?.name || actor?.email || "Someone"
  await createNotification(workspaceId, userId, "project_created", "project", data.id, `${actorName} created project "${data.name}"`)
    .catch(() => {})

  await updateOnboardingStep(userId, "created_project").catch(() => {})

  return data
}

export async function updateProject(workspaceId: string, userId: string, id: string, project: Partial<NewProject>): Promise<Project> {
  const existing = await db.query.projects.findFirst({ where: eq(projects.id, id) })
  if (!existing) throw new Error("Project not found")
  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "project:edit_any")
  }
  const [data] = await db.update(projects)
    .set({ ...project, updated_at: new Date() } as any)
    .where(eq(projects.id, id))
    .returning()

  await cacheDel(`projects:${workspaceId}`)

  return data
}

export async function deleteProject(workspaceId: string, userId: string, id: string): Promise<void> {
  const existing = await db.query.projects.findFirst({ where: eq(projects.id, id) })
  if (!existing) throw new Error("Project not found")
  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "project:delete_any")
  }
  await db.delete(projects).where(eq(projects.id, id))

  await cacheDel(`projects:${workspaceId}`, `stats:${workspaceId}`)

  const actor = await db.query.users.findFirst({ where: eq(users.id, userId) })
  const actorName = actor?.name || actor?.email || "Someone"
  await createNotification(workspaceId, userId, "project_deleted", "project", id, `${actorName} deleted project "${existing.name}"`)
    .catch(() => {})
}
