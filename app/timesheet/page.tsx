"use client"

import { AppShell } from "@/components/layout/app-shell"
import { TimesheetList } from "@/components/timesheet/timesheet-list"

export default function TimesheetPage() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <TimesheetList />
      </div>
    </AppShell>
  )
}
