"use client"

import { AppShell } from "@/components/layout/app-shell"
import { ProjectList } from "@/components/projects/project-list"

export default function ProjectsPage() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <ProjectList />
      </div>
    </AppShell>
  )
}
