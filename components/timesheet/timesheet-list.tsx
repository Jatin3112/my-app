"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { format, startOfMonth, endOfMonth } from "date-fns"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Pencil, Trash2, Calendar as CalendarIcon, Search, Download, FileText, FileSpreadsheet } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { VoiceInput } from "@/components/ui/voice-input"
import { toast } from "sonner"
import {
  createTimesheetEntry,
  updateTimesheetEntry,
  deleteTimesheetEntry,
} from "@/lib/api/timesheet"
import { bulkDeleteTimesheetEntries } from "@/lib/api/bulk-actions"
import { loadTimesheetPageData } from "@/lib/api/loaders"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import type { TimesheetEntry, Project } from "@/lib/db/schema"
import { useWorkspace } from "@/hooks/use-workspace"

export function TimesheetList() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id

  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  const now = new Date()
  const [entries, setEntries] = useState<TimesheetEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"))
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), "yyyy-MM-dd"))
  const [filterProject, setFilterProject] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [formData, setFormData] = useState({
    date: format(now, "yyyy-MM-dd"),
    project_name: "",
    task_description: "",
    hours: "",
    notes: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useKeyboardShortcuts({
    onNew: () => {
      setEditingEntry(null)
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        project_name: "",
        task_description: "",
        hours: "",
        notes: "",
      })
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

  useEffect(() => {
    if (userId && workspaceId) {
      loadPageData()
    }
  }, [userId, workspaceId])

  useEffect(() => {
    if (userId && workspaceId) loadEntries()
  }, [dateFrom, dateTo])

  // Refresh when an entry is created via Quick Capture
  useEffect(() => {
    const handler = () => loadPageData()
    window.addEventListener("timesheet-created", handler)
    return () => window.removeEventListener("timesheet-created", handler)
  }, [userId, workspaceId])

  async function loadPageData() {
    if (!userId || !workspaceId) return
    try {
      const data = await loadTimesheetPageData(workspaceId, userId, dateFrom, dateTo)
      setEntries(data.entries)
      setProjects(data.projects)
    } catch (error) {
      toast.error("Failed to load timesheet entries")
      console.error(error)
    } finally {
      setIsInitialLoading(false)
    }
  }

  async function loadEntries() {
    if (!userId || !workspaceId) return
    try {
      const data = await loadTimesheetPageData(workspaceId, userId, dateFrom, dateTo)
      setEntries(data.entries)
    } catch (error) {
      toast.error("Failed to load timesheet entries")
      console.error(error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !workspaceId) return
    if (!formData.project_name.trim() || !formData.task_description.trim() || !formData.hours) {
      toast.error("Please fill in all required fields")
      return
    }

    const hours = parseFloat(formData.hours)
    if (isNaN(hours) || hours <= 0) {
      toast.error("Hours must be a positive number")
      return
    }

    setIsLoading(true)
    try {
      const entryData = {
        date: formData.date,
        project_name: formData.project_name,
        task_description: formData.task_description,
        hours,
        notes: formData.notes || null,
      }

      if (editingEntry) {
        await updateTimesheetEntry(workspaceId, userId, editingEntry.id, entryData)
        toast.success("Entry updated successfully")
      } else {
        await createTimesheetEntry(workspaceId, userId, entryData)
        toast.success("Entry created successfully")
      }
      await loadEntries()
      handleClose()
    } catch (error) {
      toast.error(editingEntry ? "Failed to update entry" : "Failed to create entry")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleSingleDelete(id: string) {
    const entry = entries.find((e) => e.id === id)
    if (!entry) return

    setEntries((prev) => prev.filter((e) => e.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })

    toast("Entry deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
          setEntries((prev) => [...prev, entry].sort((a, b) => b.date.localeCompare(a.date)))
        },
      },
      duration: 5000,
    })

    undoTimerRef.current = setTimeout(async () => {
      try {
        await deleteTimesheetEntry(workspaceId!, userId, id)
      } catch (error) {
        setEntries((prev) => [...prev, entry])
        toast.error("Failed to delete entry")
        console.error(error)
      }
    }, 5000)
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    try {
      await bulkDeleteTimesheetEntries(ids, workspaceId!, userId!)
      toast.success(`${ids.length} entry(ies) deleted`)
      setSelectedIds(new Set())
      await loadEntries()
    } catch (error) {
      toast.error("Failed to delete entries")
      console.error(error)
    }
    setIsBulkDeleteOpen(false)
  }

  function handleEdit(entry: TimesheetEntry) {
    setEditingEntry(entry)
    setFormData({
      date: entry.date,
      project_name: entry.project_name,
      task_description: entry.task_description,
      hours: entry.hours.toString(),
      notes: entry.notes || "",
    })
    setIsOpen(true)
  }

  function handleClose() {
    setIsOpen(false)
    setEditingEntry(null)
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      project_name: "",
      task_description: "",
      hours: "",
      notes: "",
    })
  }

  // Client-side filters on top of server-side date range
  const filteredEntries = entries.filter((entry) => {
    if (filterProject !== "all" && entry.project_name !== filterProject) return false
    if (searchQuery && !entry.task_description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Group entries by date
  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    const date = entry.date
    if (!acc[date]) acc[date] = []
    acc[date].push(entry)
    return acc
  }, {} as Record<string, TimesheetEntry[]>)

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a))

  const allVisibleSelected = filteredEntries.length > 0 && filteredEntries.every((e) => selectedIds.has(e.id))

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredEntries.map((e) => e.id)))
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

  async function handleExport(formatType: "csv" | "pdf") {
    if (!workspaceId) return
    try {
      const params = new URLSearchParams({
        workspaceId,
        format: formatType,
        startDate: dateFrom,
        endDate: dateTo,
        workspaceName: currentWorkspace?.name || "Workspace",
      })
      const response = await fetch(`/api/export/timesheet?${params}`)
      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `timesheet-${dateFrom}-to-${dateTo}.${formatType}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Timesheet exported as ${formatType.toUpperCase()}`)
    } catch (error) {
      toast.error("Failed to export timesheet")
      console.error(error)
    }
  }

  // Unique project names from entries for filter
  const projectNames = [...new Set(entries.map((e) => e.project_name))].sort()

  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-9 w-28 bg-muted animate-pulse rounded" />
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3">
            <div className="h-5 w-48 bg-muted-foreground/20 animate-pulse rounded" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>Project</TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="w-[100px]">Hours</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-40 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Timesheet Entries</h2>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingEntry(null)
                    setFormData({
                      date: format(new Date(), "yyyy-MM-dd"),
                      project_name: "",
                      task_description: "",
                      hours: "",
                      notes: "",
                    })
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingEntry ? "Edit Entry" : "Add New Entry"}</DialogTitle>
                  <DialogDescription>
                    {editingEntry ? "Update the timesheet entry details below." : "Log your work for the day."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Date *</Label>
                    <DatePicker
                      value={formData.date}
                      onChange={(date) => setFormData({ ...formData, date })}
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="project">Project *</Label>
                    <Select
                      value={formData.project_name}
                      onValueChange={(value) => setFormData({ ...formData, project_name: value })}
                    >
                      <SelectTrigger id="project" className="w-full">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.length === 0 ? (
                          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                            No projects available. Create one from the Home page first.
                          </div>
                        ) : (
                          projects.map((project) => (
                            <SelectItem key={project.id} value={project.name}>
                              {project.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="task_description">Task Description *</Label>
                      <VoiceInput onResult={(text) => setFormData({ ...formData, task_description: text })} />
                    </div>
                    <Textarea
                      id="task_description"
                      value={formData.task_description}
                      onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                      placeholder="What did you work on?"
                      rows={3}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hours">Hours *</Label>
                    <Input
                      id="hours"
                      type="number"
                      step="0.25"
                      min="0.25"
                      value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                      placeholder="e.g., 2.5"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes (optional)"
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : editingEntry ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">From</Label>
            <DatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="Start date"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">To</Label>
            <DatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="End date"
            />
          </div>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projectNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Entries grouped by date */}
      <div className="space-y-6">
        {sortedDates.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            {searchQuery || filterProject !== "all"
              ? "No entries match your filters."
              : "No timesheet entries for this period. Add one to get started!"}
          </div>
        ) : (
          sortedDates.map((date) => {
            const dateEntries = groupedEntries[date]
            const totalHours = dateEntries.reduce((sum, entry) => sum + entry.hours, 0)

            return (
              <div key={date} className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold">
                      {format(new Date(date + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                    </h3>
                  </div>
                  <span className="text-sm font-medium">
                    Total: {totalHours.toFixed(2)} hours
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={dateEntries.every((e) => selectedIds.has(e.id))}
                          onCheckedChange={() => {
                            const allSelected = dateEntries.every((e) => selectedIds.has(e.id))
                            setSelectedIds((prev) => {
                              const next = new Set(prev)
                              dateEntries.forEach((e) => {
                                if (allSelected) next.delete(e.id)
                                else next.add(e.id)
                              })
                              return next
                            })
                          }}
                        />
                      </TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead className="w-[100px]">Hours</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dateEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(entry.id)}
                            onCheckedChange={() => toggleSelect(entry.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{entry.project_name}</TableCell>
                        <TableCell>{entry.task_description}</TableCell>
                        <TableCell>{entry.hours.toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.notes || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(entry)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleSingleDelete(entry.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          })
        )}
      </div>

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border bg-background shadow-lg px-4 py-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-border" />
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
            <AlertDialogTitle>Delete {selectedIds.size} entry(ies)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected timesheet entries.
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
    </div>
  )
}
