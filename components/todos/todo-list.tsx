"use client"

import { useState, useEffect } from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Plus, Pencil, Trash2, Check, X } from "lucide-react"
import { toast } from "sonner"
import { getTodos, createTodo, updateTodo, toggleTodoComplete, deleteTodo } from "@/lib/api/todos"
import { getProjects } from "@/lib/api/projects"
import type { Todo, Project } from "@/lib/supabase/database"

interface TodoListProps {
  onProjectsChange?: () => void
}

export function TodoList({ onProjectsChange }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [filterProjectId, setFilterProjectId] = useState<string>("all")
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project_id: "none",
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadTodos()
    loadProjects()
  }, [])

  useEffect(() => {
    if (onProjectsChange) {
      loadProjects()
    }
  }, [onProjectsChange])

  async function loadTodos() {
    try {
      const data = await getTodos()
      setTodos(data)
    } catch (error) {
      toast.error("Failed to load todos")
      console.error(error)
    }
  }

  async function loadProjects() {
    try {
      const data = await getProjects()
      setProjects(data)
    } catch (error) {
      toast.error("Failed to load projects")
      console.error(error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error("Todo title is required")
      return
    }

    setIsLoading(true)
    try {
      const todoData = {
        ...formData,
        project_id: formData.project_id === "none" ? null : formData.project_id,
      }

      if (editingTodo) {
        await updateTodo(editingTodo.id, todoData)
        toast.success("Todo updated successfully")
      } else {
        await createTodo(todoData)
        toast.success("Todo created successfully")
      }
      await loadTodos()
      handleClose()
    } catch (error) {
      toast.error(editingTodo ? "Failed to update todo" : "Failed to create todo")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleToggleComplete(todo: Todo) {
    try {
      await toggleTodoComplete(todo.id, !todo.completed)
      await loadTodos()
      toast.success(todo.completed ? "Todo marked as incomplete" : "Todo marked as complete")
    } catch (error) {
      toast.error("Failed to update todo")
      console.error(error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this todo?")) {
      return
    }

    try {
      await deleteTodo(id)
      toast.success("Todo deleted successfully")
      await loadTodos()
    } catch (error) {
      toast.error("Failed to delete todo")
      console.error(error)
    }
  }

  function handleEdit(todo: Todo) {
    setEditingTodo(todo)
    setFormData({
      title: todo.title,
      description: todo.description || "",
      project_id: todo.project_id || "none",
    })
    setIsOpen(true)
  }

  function handleClose() {
    setIsOpen(false)
    setEditingTodo(null)
    setFormData({ title: "", description: "", project_id: "none" })
  }

  function getProjectName(projectId: string | null) {
    if (!projectId) return "No Project"
    const project = projects.find((p) => p.id === projectId)
    return project?.name || "Unknown Project"
  }

  const filteredTodos = filterProjectId === "all"
    ? todos
    : filterProjectId === "none"
    ? todos.filter((t) => !t.project_id)
    : todos.filter((t) => t.project_id === filterProjectId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Todos</h2>
          <Select value={filterProjectId} onValueChange={setFilterProjectId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Todos</SelectItem>
              <SelectItem value="none">No Project</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingTodo(null); setFormData({ title: "", description: "", project_id: "none" }); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Todo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingTodo ? "Edit Todo" : "Add New Todo"}</DialogTitle>
                <DialogDescription>
                  {editingTodo ? "Update the todo details below." : "Create a new todo and optionally assign it to a project."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="What needs to be done?"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add more details (optional)"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project">Project</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  >
                    <SelectTrigger id="project" className="w-full">
                      <SelectValue placeholder="Select a project (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : editingTodo ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Status</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTodos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No todos found. Create one to get started!
                </TableCell>
              </TableRow>
            ) : (
              filteredTodos.map((todo) => (
                <TableRow key={todo.id} className={todo.completed ? "opacity-60" : ""}>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleComplete(todo)}
                      className="h-8 w-8 p-0"
                    >
                      {todo.completed ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <X className="w-5 h-5 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className={todo.completed ? "line-through" : ""}>
                    {todo.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {todo.description || "-"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs">
                      {getProjectName(todo.project_id)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(todo)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(todo.id)}
                      >
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
    </div>
  )
}
