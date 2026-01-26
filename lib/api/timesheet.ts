import { supabase } from '../supabase/client'
import type { InsertTimesheetEntry, UpdateTimesheetEntry, TimesheetEntry } from '../supabase/database'

export async function getTimesheetEntries(startDate?: string, endDate?: string): Promise<TimesheetEntry[]> {
  let query = supabase
    .from('timesheet_entries')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function createTimesheetEntry(entry: InsertTimesheetEntry): Promise<TimesheetEntry> {
  const { data, error } = await supabase
    .from('timesheet_entries')
    .insert({ ...entry, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTimesheetEntry(id: string, entry: UpdateTimesheetEntry): Promise<TimesheetEntry> {
  const { data, error } = await supabase
    .from('timesheet_entries')
    .update({ ...entry, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTimesheetEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('timesheet_entries')
    .delete()
    .eq('id', id)

  if (error) throw error
}
