"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { getWorkspacesForUser, createWorkspace } from "@/lib/api/workspaces"

type WorkspaceWithRole = {
  id: string
  name: string
  slug: string
  owner_id: string
  role: string
  created_at: Date
  updated_at: Date
}

type WorkspaceContextType = {
  workspaces: WorkspaceWithRole[]
  currentWorkspace: WorkspaceWithRole | null
  switchWorkspace: (workspaceId: string) => void
  refreshWorkspaces: () => Promise<void>
  isLoading: boolean
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

const STORAGE_KEY = "last-workspace-id"

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "My"

  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceWithRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadWorkspaces = useCallback(async () => {
    if (!userId) return
    try {
      const data = await getWorkspacesForUser(userId)
      setWorkspaces(data)

      if (data.length === 0) {
        // First-time user — create default workspace
        const newWorkspace = await createWorkspace(userId, { name: `${userName}'s Workspace` })
        const wsWithRole = { ...newWorkspace, role: "owner" } as WorkspaceWithRole
        setWorkspaces([wsWithRole])
        setCurrentWorkspace(wsWithRole)
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, newWorkspace.id)
        }
        return
      }

      // Restore last used workspace
      const lastId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
      const lastWorkspace = lastId ? data.find((w) => w.id === lastId) : null
      setCurrentWorkspace(lastWorkspace || data[0])
    } catch (error) {
      console.error("Failed to load workspaces:", error)
    } finally {
      setIsLoading(false)
    }
  }, [userId, userName])

  useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])

  function switchWorkspace(workspaceId: string) {
    const workspace = workspaces.find((w) => w.id === workspaceId)
    if (workspace) {
      setCurrentWorkspace(workspace)
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, workspaceId)
      }
    }
  }

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        switchWorkspace,
        refreshWorkspaces: loadWorkspaces,
        isLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider")
  }
  return context
}
