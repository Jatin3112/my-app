"use server"

import { db } from '../db'
import { todos, type Todo, type NewTodo } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function getTodos(user_id: string, project_id?: string): Promise<Todo[]> {
  const conditions = [eq(todos.user_id, user_id)]
  
  if (project_id) {
    conditions.push(eq(todos.project_id, project_id))
  }

  const data = await db.query.todos.findMany({
    where: and(...conditions),
    orderBy: [desc(todos.created_at)],
  })

  return data
}

export async function createTodo(user_id: string, todo: Omit<NewTodo, 'user_id'>): Promise<Todo> {
  const [data] = await db.insert(todos)
    .values({ 
      ...todo, 
      user_id, 
      updated_at: new Date() 
    } as any)
    .returning()

  return data
}

export async function updateTodo(id: string, todo: Partial<NewTodo>): Promise<Todo> {
  const [data] = await db.update(todos)
    .set({ 
      ...todo, 
      updated_at: new Date() 
    } as any)
    .where(eq(todos.id, id))
    .returning()

  return data
}

export async function toggleTodoComplete(id: string, completed: boolean): Promise<Todo> {
  const [data] = await db.update(todos)
    .set({ completed, updated_at: new Date() })
    .where(eq(todos.id, id))
    .returning()

  return data
}

export async function deleteTodo(id: string): Promise<void> {
  await db.delete(todos).where(eq(todos.id, id))
}
