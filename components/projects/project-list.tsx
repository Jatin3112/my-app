"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search, FolderOpen } from "lucide-react"
import { toast } from "sonner"
import { getProjects, createProject, updateProject, deleteProject } from "@/lib/api/projects"
import type { Project } from "@/lib/db/schema"
import { useWorkspace } from "@/hooks/use-workspace"
import { formatDistanceToNow } from "date-fns"

type WorkspaceWithRole = {
  id: string
  name: string
  slug: string
  owner_id: string
  role: string
  created_at: Date
  updated_at: Date
}

type ProjectListProps = {
  initialProjects?: Project[]
  workspaces?: WorkspaceWithRole[]
  currentWorkspace?: WorkspaceWithRole
}

export function ProjectList({ initialProjects, workspaces: initialWorkspaces, currentWorkspace: initialCurrentWorkspace }: ProjectListProps) {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const { currentWorkspace, seedWorkspaces } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  // Seed workspace provider with server-fetched data
  const seededRef = useRef(false)
  useEffect(() => {
    if (initialWorkspaces && initialCurrentWorkspace && !seededRef.current) {
      seededRef.current = true
      seedWorkspaces(initialWorkspaces, initialCurrentWorkspace)
    }
  }, [initialWorkspaces, initialCurrentWorkspace, seedWorkspaces])

  const [projects, setProjects] = useState<Project[]>(initialProjects ?? [])
  const [isOpen, setIsOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isInitialLoading, setIsInitialLoading] = useState(!initialProjects)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ name: "", description: "" })
  const searchInputRef = useRef<HTMLInputElement>(null)

  const initialWorkspaceIdRef = useRef(initialCurrentWorkspace?.id)
  useEffect(() => {
    if (!userId || !workspaceId) return
    if (initialProjects && workspaceId === initialWorkspaceIdRef.current) {
      initialWorkspaceIdRef.current = undefined
      return
    }
    loadProjects()
  }, [userId, workspaceId])

  async function loadProjects() {
    if (!userId || !workspaceId) return
    try {
      const data = await getProjects(workspaceId, userId)
      setProjects(data)
    } catch (error) {
      toast.error("Failed to load projects")
      console.error(error)
    } finally {
      setIsInitialLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !workspaceId) return
    if (!formData.name.trim()) {
      toast.error("Project name is required")
      return
    }

    setIsLoading(true)
    try {
      if (editingProject) {
        await updateProject(workspaceId, userId, editingProject.id, formData)
        toast.success("Project updated successfully")
      } else {
        await createProject(workspaceId, userId, formData)
        toast.success("Project created successfully")
      }
      await loadProjects()
      handleClose()
    } catch (error) {
      toast.error(editingProject ? "Failed to update project" : "Failed to create project")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !userId || !workspaceId) return
    try {
      await deleteProject(workspaceId, userId, deleteTarget.id)
      toast.success("Project deleted successfully")
      await loadProjects()
    } catch (error) {
      toast.error("Failed to delete project")
      console.error(error)
    }
    setDeleteTarget(null)
  }

  function handleEdit(project: Project) {
    setEditingProject(project)
    setFormData({ name: project.name, description: project.description || "" })
    setIsOpen(true)
  }

  function handleClose() {
    setIsOpen(false)
    setEditingProject(null)
    setFormData({ name: "", description: "" })
  }

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery) return true
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-9 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-48 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15">
              <FolderOpen className="size-6 text-cyan-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Projects</h2>
              <p className="text-sm text-muted-foreground">
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingProject(null); setFormData({ name: "", description: "" }) }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingProject ? "Edit Project" : "Add New Project"}</DialogTitle>
                  <DialogDescription>
                    {editingProject
                      ? "Update the project details below."
                      : "Create a new project to organize your todos."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Project Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Work, Personal, Study"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : editingProject ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {searchQuery
                    ? "No projects match your search."
                    : "No projects yet. Create one to get started!"}
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.description || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(project)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(project)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project and unlink all associated todos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
