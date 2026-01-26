export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          id: string
          title: string
          description: string | null
          project_id: string | null
          completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          project_id?: string | null
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          project_id?: string | null
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      timesheet_entries: {
        Row: {
          id: string
          date: string
          project_name: string
          task_description: string
          hours: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date: string
          project_name: string
          task_description: string
          hours: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          project_name?: string
          task_description?: string
          hours?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier use
export type Project = Database['public']['Tables']['projects']['Row']
export type Todo = Database['public']['Tables']['todos']['Row']
export type TimesheetEntry = Database['public']['Tables']['timesheet_entries']['Row']

export type InsertProject = Database['public']['Tables']['projects']['Insert']
export type InsertTodo = Database['public']['Tables']['todos']['Insert']
export type InsertTimesheetEntry = Database['public']['Tables']['timesheet_entries']['Insert']

export type UpdateProject = Database['public']['Tables']['projects']['Update']
export type UpdateTodo = Database['public']['Tables']['todos']['Update']
export type UpdateTimesheetEntry = Database['public']['Tables']['timesheet_entries']['Update']
