import type { TimesheetEntry } from "@/lib/db/schema"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function generateTimesheetCSV(entries: TimesheetEntry[]): string {
  const headers = "Date,Project,Task,Hours,Notes"
  const rows = entries.map((e) =>
    [
      e.date,
      escapeCSV(e.project_name),
      escapeCSV(e.task_description),
      e.hours,
      e.notes ? escapeCSV(e.notes) : "",
    ].join(",")
  )

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)
  const totalRow = `Total,,,${totalHours},`

  return [headers, ...rows, totalRow].join("\n")
}

export function generateTimesheetPDF(
  entries: TimesheetEntry[],
  workspaceName: string,
  dateRange: string
): ArrayBuffer {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(18)
  doc.text(workspaceName, 14, 22)
  doc.setFontSize(12)
  doc.text("Timesheet Report", 14, 30)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(dateRange, 14, 36)
  doc.setTextColor(0)

  // Table
  const tableData = entries.map((e) => [
    e.date,
    e.project_name,
    e.task_description,
    e.hours.toString(),
    e.notes || "",
  ])

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)
  tableData.push(["", "", "Total", totalHours.toString(), ""])

  autoTable(doc, {
    startY: 42,
    head: [["Date", "Project", "Task", "Hours", "Notes"]],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185] },
  })

  return doc.output("arraybuffer")
}
