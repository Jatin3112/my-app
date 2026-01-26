import { supabase } from '../supabase/client'
import type { InsertTodo, UpdateTodo, Todo } from '../supabase/database'

export async function getTodos(projectId?: string): Promise<Todo[]> {
  let query = supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function createTodo(todo: InsertTodo): Promise<Todo> {
  const { data, error } = await supabase
    .from('todos')
    .insert({ ...todo, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTodo(id: string, todo: UpdateTodo): Promise<Todo> {
  const { data, error } = await supabase
    .from('todos')
    .update({ ...todo, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function toggleTodoComplete(id: string, completed: boolean): Promise<Todo> {
  const { data, error } = await supabase
    .from('todos')
    .update({ completed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)

  if (error) throw error
}
