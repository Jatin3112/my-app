"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
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
import { Plus, Pencil, Trash2, Calendar as CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import {
  getTimesheetEntries,
  createTimesheetEntry,
  updateTimesheetEntry,
  deleteTimesheetEntry,
} from "@/lib/api/timesheet"
import { getProjects } from "@/lib/api/projects"
import type { TimesheetEntry, Project } from "@/lib/supabase/database"

export function TimesheetList() {
  const [entries, setEntries] = useState<TimesheetEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null)
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    project_name: "",
    task_description: "",
    hours: "",
    notes: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadEntries()
    loadProjects()
  }, [])

  async function loadEntries() {
    try {
      const data = await getTimesheetEntries()
      setEntries(data)
    } catch (error) {
      toast.error("Failed to load timesheet entries")
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
        await updateTimesheetEntry(editingEntry.id, entryData)
        toast.success("Entry updated successfully")
      } else {
        await createTimesheetEntry(entryData)
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

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this entry?")) {
      return
    }

    try {
      await deleteTimesheetEntry(id)
      toast.success("Entry deleted successfully")
      await loadEntries()
    } catch (error) {
      toast.error("Failed to delete entry")
      console.error(error)
    }
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

  // Group entries by date
  const groupedEntries = entries.reduce((acc, entry) => {
    const date = entry.date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(entry)
    return acc
  }, {} as Record<string, TimesheetEntry[]>)

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Timesheet Entries</h2>

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
                  {editingEntry
                    ? "Update the timesheet entry details below."
                    : "Log your work for the day."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
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
                          No projects available. Create one in the Todos page first.
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
                  <Label htmlFor="task_description">Task Description *</Label>
                  <Textarea
                    id="task_description"
                    value={formData.task_description}
                    onChange={(e) =>
                      setFormData({ ...formData, task_description: e.target.value })
                    }
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

      <div className="space-y-6">
        {sortedDates.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            No timesheet entries yet. Add one to get started!
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
                        <TableCell className="font-medium">{entry.project_name}</TableCell>
                        <TableCell>{entry.task_description}</TableCell>
                        <TableCell>{entry.hours.toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.notes || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(entry)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(entry.id)}
                            >
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
    </div>
  )
}
