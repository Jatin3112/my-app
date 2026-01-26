"use server"

import { db } from '../db'
import { projects, type Project, type NewProject } from '../db/schema'
import { eq } from 'drizzle-orm'

export async function getProjects(user_id: string): Promise<Project[]> {
  const data = await db.query.projects.findMany({
    where: eq(projects.user_id, user_id),
  })

  return data
}

export async function createProject(user_id: string, project: Omit<NewProject, 'user_id'>): Promise<Project> {
  const [data] = await db.insert(projects)
    .values({ 
      ...project, 
      user_id, 
      updated_at: new Date() 
    } as any)
    .returning()

  return data
}

export async function updateProject(id: string, project: Partial<NewProject>): Promise<Project> {
  const [data] = await db.update(projects)
    .set({ 
      ...project, 
      updated_at: new Date() 
    } as any)
    .where(eq(projects.id, id))
    .returning()

  return data
}

export async function deleteProject(id: string): Promise<void> {
  await db.delete(projects).where(eq(projects.id, id))
}
