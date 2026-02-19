"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2, Check, X, Search, GripVertical, MessageSquare } from "lucide-react"
import { VoiceInput } from "@/components/ui/voice-input"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { createTodo, updateTodo, toggleTodoComplete, deleteTodo } from "@/lib/api/todos"
import { bulkDeleteTodos, bulkToggleTodos } from "@/lib/api/bulk-actions"
import { loadTodoPageData } from "@/lib/api/loaders"
import { reorderTodos } from "@/lib/api/reorder"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import type { Todo, Project } from "@/lib/db/schema"
import type { TodoPageData } from "@/lib/api/loaders"
import { useWorkspace } from "@/hooks/use-workspace"
import { CommentList } from "@/components/comments/comment-list"
import { Separator } from "@/components/ui/separator"

type WorkspaceWithRole = {
  id: string
  name: string
  slug: string
  owner_id: string
  role: string
  created_at: Date
  updated_at: Date
}

type TodoListProps = {
  initialData?: TodoPageData
  workspaces?: WorkspaceWithRole[]
  currentWorkspace?: WorkspaceWithRole
}

type StatusFilter = "all" | "completed" | "pending"

interface SortableRowProps {
  todo: Todo
  isSelected: boolean
  onToggleSelect: () => void
  onToggleComplete: () => void
  onEdit: () => void
  onDelete: () => void
  onViewDetail: () => void
  getProjectName: (id: string | null) => string
}

function SortableRow({
  todo,
  isSelected,
  onToggleSelect,
  onToggleComplete,
  onEdit,
  onDelete,
  onViewDetail,
  getProjectName,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={todo.completed ? "opacity-60" : ""}
    >
      <TableCell>
        <button
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
        />
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="ghost"
          onClick={onToggleComplete}
          className="h-8 w-8 p-0"
        >
          {todo.completed ? (
            <Check className="w-5 h-5 text-green-600" />
          ) : (
            <X className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>
      </TableCell>
      <TableCell className={`${todo.completed ? "line-through" : ""} cursor-pointer hover:text-primary`} onClick={onViewDetail}>
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
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function TodoList({ initialData, workspaces: initialWorkspaces, currentWorkspace: initialCurrentWorkspace }: TodoListProps) {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id

  const { currentWorkspace, seedWorkspaces } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  // Seed workspace provider with server-fetched data (runs before provider's own useEffect)
  const seededRef = useRef(false)
  useEffect(() => {
    if (initialWorkspaces && initialCurrentWorkspace && !seededRef.current) {
      seededRef.current = true
      seedWorkspaces(initialWorkspaces, initialCurrentWorkspace)
    }
  }, [initialWorkspaces, initialCurrentWorkspace, seedWorkspaces])

  const [todos, setTodos] = useState<Todo[]>(initialData?.todos ?? [])
  const [projects, setProjects] = useState<Project[]>(initialData?.projects ?? [])
  const [isOpen, setIsOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [filterProjectId, setFilterProjectId] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(!initialData)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project_id: "none",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [detailTodo, setDetailTodo] = useState<Todo | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useKeyboardShortcuts({
    onNew: () => {
      setEditingTodo(null)
      setFormData({ title: "", description: "", project_id: "none" })
      setIsOpen(true)
    },
    onSearch: () => searchInputRef.current?.focus(),
    onSelectAll: () => toggleSelectAll(),
    onDelete: () => {
      if (selectedIds.size > 0) setIsBulkDeleteOpen(true)
    },
    onEscape: () => {
      if (isOpen) setIsOpen(false)
      else if (selectedIds.size > 0) setSelectedIds(new Set())
      else if (searchQuery) setSearchQuery("")
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = filteredTodos.findIndex((t) => t.id === active.id)
    const newIndex = filteredTodos.findIndex((t) => t.id === over.id)
    const reordered = arrayMove(filteredTodos, oldIndex, newIndex)

    // Optimistic reorder in full list
    const reorderedIds = reordered.map((t) => t.id)
    const nonFiltered = todos.filter((t) => !reorderedIds.includes(t.id))
    setTodos([...reordered, ...nonFiltered])

    try {
      await reorderTodos(reorderedIds)
    } catch (error) {
      await loadTodos()
      toast.error("Failed to reorder todos")
      console.error(error)
    }
  }

  const initialWorkspaceIdRef = useRef(initialCurrentWorkspace?.id)
  useEffect(() => {
    if (!userId || !workspaceId) return
    // Skip fetch if we already have server-provided data for this workspace
    if (initialData && workspaceId === initialWorkspaceIdRef.current) {
      initialWorkspaceIdRef.current = undefined // only skip once
      return
    }
    loadPageData()
  }, [userId, workspaceId])

  // Refresh when a todo is created via Quick Capture
  useEffect(() => {
    const handler = () => loadPageData()
    window.addEventListener("todo-created", handler)
    return () => window.removeEventListener("todo-created", handler)
  }, [userId, workspaceId])

  async function loadPageData() {
    if (!userId || !workspaceId) return
    try {
      const data = await loadTodoPageData(workspaceId, userId)
      setTodos(data.todos)
      setProjects(data.projects)
    } catch (error) {
      toast.error("Failed to load todos")
      console.error(error)
    } finally {
      setIsInitialLoading(false)
    }
  }

  // Lightweight refresh for after mutations (reuses combined loader, projects hit cache)
  async function loadTodos() {
    if (!userId || !workspaceId) return
    try {
      const data = await loadTodoPageData(workspaceId, userId)
      setTodos(data.todos)
    } catch (error) {
      console.error(error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !workspaceId) return
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
        await updateTodo(workspaceId, userId, editingTodo.id, todoData)
        toast.success("Todo updated successfully")
      } else {
        await createTodo(workspaceId, userId, todoData)
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

  const handleToggleComplete = useCallback(async (todo: Todo) => {
    // Optimistic update
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
    )
    try {
      await toggleTodoComplete(workspaceId!, userId, todo.id, !todo.completed)
    } catch (error) {
      // Revert on failure
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, completed: todo.completed } : t))
      )
      toast.error("Failed to update todo")
      console.error(error)
    }
  }, [])

  function handleSingleDelete(id: string) {
    const todo = todos.find((t) => t.id === id)
    if (!todo) return

    // Optimistic remove
    setTodos((prev) => prev.filter((t) => t.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })

    const toastId = toast("Todo deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
          setTodos((prev) => [...prev, todo].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ))
        },
      },
      duration: 5000,
    })

    undoTimerRef.current = setTimeout(async () => {
      try {
        await deleteTodo(workspaceId!, userId, id)
      } catch (error) {
        setTodos((prev) => [...prev, todo])
        toast.error("Failed to delete todo")
        console.error(error)
      }
    }, 5000)
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    try {
      await bulkDeleteTodos(ids, workspaceId)
      toast.success(`${ids.length} todo(s) deleted`)
      setSelectedIds(new Set())
      await loadTodos()
    } catch (error) {
      toast.error("Failed to delete todos")
      console.error(error)
    }
    setIsBulkDeleteOpen(false)
  }

  async function handleBulkToggle(completed: boolean) {
    const ids = Array.from(selectedIds)
    // Optimistic update
    setTodos((prev) =>
      prev.map((t) => (ids.includes(t.id) ? { ...t, completed } : t))
    )
    try {
      await bulkToggleTodos(ids, completed, workspaceId)
      setSelectedIds(new Set())
    } catch (error) {
      await loadTodos()
      toast.error("Failed to update todos")
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

  // Apply all filters
  const filteredTodos = todos.filter((todo) => {
    if (filterProjectId !== "all") {
      if (filterProjectId === "none" && todo.project_id) return false
      if (filterProjectId !== "none" && todo.project_id !== filterProjectId) return false
    }
    if (statusFilter === "completed" && !todo.completed) return false
    if (statusFilter === "pending" && todo.completed) return false
    if (searchQuery && !todo.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const allVisibleSelected = filteredTodos.length > 0 && filteredTodos.every((t) => selectedIds.has(t.id))

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTodos.map((t) => t.id)))
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Skeleton rows
  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-9 w-28 bg-muted animate-pulse rounded" />
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead className="w-[40px]" />
                <TableHead className="w-[50px]">Status</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-5 bg-muted animate-pulse rounded-full" /></TableCell>
                  <TableCell><div className="h-4 w-40 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded" /></TableCell>
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
      {/* Header with filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Todos</h2>
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
                    <div className="flex items-center gap-2">
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="What needs to be done?"
                        required
                      />
                      <VoiceInput onResult={(text) => setFormData({ ...formData, title: text })} />
                    </div>
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

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search todos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filterProjectId} onValueChange={setFilterProjectId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="none">No Project</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-md border">
            {(["all", "pending", "completed"] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                } ${status === "all" ? "rounded-l-md" : ""} ${status === "completed" ? "rounded-r-md" : ""}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allVisibleSelected && filteredTodos.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery || statusFilter !== "all" || filterProjectId !== "all"
                      ? "No todos match your filters."
                      : "No todos found. Create one to get started!"}
                  </TableCell>
                </TableRow>
              ) : (
                <SortableContext items={filteredTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {filteredTodos.map((todo) => (
                    <SortableRow
                      key={todo.id}
                      todo={todo}
                      isSelected={selectedIds.has(todo.id)}
                      onToggleSelect={() => toggleSelect(todo.id)}
                      onToggleComplete={() => handleToggleComplete(todo)}
                      onEdit={() => handleEdit(todo)}
                      onDelete={() => handleSingleDelete(todo.id)}
                      onViewDetail={() => setDetailTodo(todo)}
                      getProjectName={getProjectName}
                    />
                  ))}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </div>
      </DndContext>

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border bg-background shadow-lg px-4 py-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-border" />
          <Button size="sm" variant="outline" onClick={() => handleBulkToggle(true)}>
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Complete
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleBulkToggle(false)}>
            <X className="w-3.5 h-3.5 mr-1.5" />
            Incomplete
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setIsBulkDeleteOpen(true)}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Bulk delete confirmation */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} todo(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected todos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Todo detail dialog */}
      <Dialog open={!!detailTodo} onOpenChange={(open) => { if (!open) setDetailTodo(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailTodo?.title}</DialogTitle>
            <DialogDescription>
              {detailTodo?.description || "No description"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className={`px-2 py-0.5 rounded text-xs ${detailTodo?.completed ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"}`}>
                {detailTodo?.completed ? "Completed" : "Pending"}
              </span>
              <span className="text-muted-foreground">
                Project: {getProjectName(detailTodo?.project_id || null)}
              </span>
            </div>
            <Separator />
            {detailTodo && <CommentList todoId={detailTodo.id} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
