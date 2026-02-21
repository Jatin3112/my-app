"use server"

import { db } from '../db'
import { todos, users, type Todo, type NewTodo } from '../db/schema'
import { eq, and, asc, max } from 'drizzle-orm'
import { requirePermission, getMemberRole } from '@/lib/auth/permissions'
import { createNotification } from '@/lib/api/notifications'
import { getNextDueDate, shouldGenerateNextOccurrence } from '@/lib/api/recurrence'
import { cacheDel } from '@/lib/cache'

export async function getTodos(workspaceId: string, userId: string, project_id?: string): Promise<Todo[]> {
  await requirePermission(userId, workspaceId, "todo:view_all")
  const conditions = [eq(todos.workspace_id, workspaceId)]
  if (project_id) {
    conditions.push(eq(todos.project_id, project_id))
  }
  const data = await db.query.todos.findMany({
    where: and(...conditions),
    orderBy: [asc(todos.sort_order), asc(todos.created_at)],
  })
  return data
}

export async function createTodo(workspaceId: string, userId: string, todo: Omit<NewTodo, 'user_id' | 'workspace_id'>): Promise<Todo> {
  await requirePermission(userId, workspaceId, "todo:create")
  const result = await db
    .select({ maxOrder: max(todos.sort_order) })
    .from(todos)
    .where(eq(todos.workspace_id, workspaceId))
  const nextOrder = (result[0]?.maxOrder ?? -1) + 1
  const [data] = await db.insert(todos)
    .values({
      ...todo,
      user_id: userId,
      workspace_id: workspaceId,
      sort_order: nextOrder,
      updated_at: new Date()
    } as any)
    .returning()

  await cacheDel(`stats:${workspaceId}`)

  // Notification
  const actor = await db.query.users.findFirst({ where: eq(users.id, userId) })
  const actorName = actor?.name || actor?.email || "Someone"
  await createNotification(workspaceId, userId, "todo_created", "todo", data.id, `${actorName} created "${data.title}"`)
    .catch(() => {}) // Don't fail the action if notification fails

  return data
}

export async function updateTodo(workspaceId: string, userId: string, id: string, todo: Partial<NewTodo>): Promise<Todo> {
  const existing = await db.query.todos.findFirst({ where: eq(todos.id, id) })
  if (!existing) throw new Error("Todo not found")
  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "todo:edit_any")
  }
  const [data] = await db.update(todos)
    .set({ ...todo, updated_at: new Date() } as any)
    .where(eq(todos.id, id))
    .returning()

  await cacheDel(`stats:${workspaceId}`)

  return data
}

export async function toggleTodoComplete(workspaceId: string, userId: string, id: string, completed: boolean): Promise<Todo> {
  const existing = await db.query.todos.findFirst({ where: eq(todos.id, id) })
  if (!existing) throw new Error("Todo not found")
  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "todo:edit_any")
  }
  const [data] = await db.update(todos)
    .set({ completed, updated_at: new Date() })
    .where(eq(todos.id, id))
    .returning()

  await cacheDel(`stats:${workspaceId}`)

  if (completed) {
    const actor = await db.query.users.findFirst({ where: eq(users.id, userId) })
    const actorName = actor?.name || actor?.email || "Someone"
    await createNotification(workspaceId, userId, "todo_completed", "todo", id, `${actorName} completed "${existing.title}"`)
      .catch(() => {})
  }

  // Generate next occurrence for recurring todos
  if (completed && existing.recurrence_rule && existing.due_date) {
    const nextDueDate = getNextDueDate(existing.due_date, existing.recurrence_rule)
    if (shouldGenerateNextOccurrence(nextDueDate, existing.recurrence_end_date)) {
      await db.insert(todos).values({
        user_id: existing.user_id,
        workspace_id: existing.workspace_id,
        title: existing.title,
        description: existing.description,
        project_id: existing.project_id,
        priority: existing.priority,
        due_date: nextDueDate,
        recurrence_rule: existing.recurrence_rule,
        recurrence_end_date: existing.recurrence_end_date,
        parent_todo_id: existing.parent_todo_id || existing.id,
        completed: false,
        sort_order: existing.sort_order,
      } as any).returning()
    }
  }

  return data
}

export async function deleteTodo(workspaceId: string, userId: string, id: string): Promise<void> {
  const existing = await db.query.todos.findFirst({ where: eq(todos.id, id) })
  if (!existing) throw new Error("Todo not found")
  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "todo:delete_any")
  }
  await db.delete(todos).where(eq(todos.id, id))

  await cacheDel(`stats:${workspaceId}`)

  const actor = await db.query.users.findFirst({ where: eq(users.id, userId) })
  const actorName = actor?.name || actor?.email || "Someone"
  await createNotification(workspaceId, userId, "todo_deleted", "todo", id, `${actorName} deleted "${existing.title}"`)
    .catch(() => {})
}
