"use client"

import { useState, useEffect } from "react"
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
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { getProjects, createProject, updateProject, deleteProject } from "@/lib/api/projects"
import type { Project } from "@/lib/db/schema"

export function ProjectManager() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id

  const [projects, setProjects] = useState<Project[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState({ name: "", description: "" })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (userId) {
      loadProjects()
    }
  }, [userId])

  async function loadProjects() {
    if (!userId) return
    try {
      const data = await getProjects(userId)
      setProjects(data)
    } catch (error) {
      toast.error("Failed to load projects")
      console.error(error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    if (!formData.name.trim()) {
      toast.error("Project name is required")
      return
    }

    setIsLoading(true)
    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData)
        toast.success("Project updated successfully")
      } else {
        await createProject(userId, formData)
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
    if (!projectToDelete) return

    try {
      await deleteProject(projectToDelete)
      toast.success("Project deleted successfully")
      await loadProjects()
      setIsDeleteDialogOpen(false)
      setProjectToDelete(null)
    } catch (error) {
      toast.error("Failed to delete project")
      console.error(error)
    }
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

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Projects</h2>
          <span className="text-sm text-muted-foreground">({projects.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { setEditingProject(null); setFormData({ name: "", description: "" }); }}>
                <Plus className="w-4 h-4 mr-1" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingProject ? "Edit Project" : "Add New Project"}</DialogTitle>
                  <DialogDescription>
                    {editingProject ? "Update the project details below." : "Create a new project to organize your todos."}
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-2">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No projects yet. Create one to get started!
            </p>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground truncate">{project.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(project)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setProjectToDelete(project.id)
                      setIsDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your project and unlink all associated todos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
