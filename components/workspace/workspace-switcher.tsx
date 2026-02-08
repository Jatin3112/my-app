"use client"

import { useState } from "react"
import { useWorkspace } from "@/hooks/use-workspace"
import { useSession } from "next-auth/react"
import { createWorkspace } from "@/lib/api/workspaces"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronsUpDown, Plus, Check } from "lucide-react"
import { toast } from "sonner"

interface WorkspaceSwitcherProps {
  collapsed?: boolean
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const { workspaces, currentWorkspace, switchWorkspace, refreshWorkspaces } = useWorkspace()
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !newName.trim()) return

    setIsCreating(true)
    try {
      const workspace = await createWorkspace(userId, { name: newName.trim() })
      await refreshWorkspaces()
      switchWorkspace(workspace.id)
      toast.success("Workspace created")
      setIsCreateOpen(false)
      setNewName("")
    } catch (error) {
      toast.error("Failed to create workspace")
      console.error(error)
    } finally {
      setIsCreating(false)
    }
  }

  if (!currentWorkspace) return null

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      member: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    }
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[role] || colors.member}`}>
        {role}
      </span>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-between gap-2 ${collapsed ? "px-2" : "px-3"}`}
            title={collapsed ? currentWorkspace.name : undefined}
          >
            {collapsed ? (
              <span className="text-sm font-semibold truncate">
                {currentWorkspace.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold truncate">{currentWorkspace.name}</span>
                {roleBadge(currentWorkspace.role)}
              </div>
            )}
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((w) => (
            <DropdownMenuItem
              key={w.id}
              onClick={() => switchWorkspace(w.id)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                {w.id === currentWorkspace.id && <Check className="size-3.5 shrink-0" />}
                <span className="truncate">{w.name}</span>
              </div>
              {roleBadge(w.role)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4 mr-2" />
            Create Workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
              <DialogDescription>
                Create a new workspace to collaborate with your team.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Acme Corp"
                required
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
