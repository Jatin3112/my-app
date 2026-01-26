import { supabase } from '../supabase/client'
import type { InsertProject, UpdateProject, Project } from '../supabase/database'

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')

  if (error) throw error
  return data || []
}

export async function createProject(project: InsertProject): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...project, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProject(id: string, project: UpdateProject): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...project, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw error
}
