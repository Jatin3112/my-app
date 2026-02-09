"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FolderOpen } from "lucide-react"
import type { DashboardData } from "@/lib/api/loaders"

const PROGRESS_COLORS = [
  { bar: "bg-blue-500", track: "bg-blue-500/15" },
  { bar: "bg-emerald-500", track: "bg-emerald-500/15" },
  { bar: "bg-violet-500", track: "bg-violet-500/15" },
  { bar: "bg-amber-500", track: "bg-amber-500/15" },
  { bar: "bg-pink-500", track: "bg-pink-500/15" },
  { bar: "bg-cyan-500", track: "bg-cyan-500/15" },
]

interface ProjectProgressProps {
  projects: DashboardData["projectProgress"]
}

export function ProjectProgress({ projects }: ProjectProgressProps) {
  if (projects.length === 0) {
    return (
      <Card className="rounded-xl border-amber-500/20">
        <CardHeader className="flex flex-row items-center gap-2">
          <FolderOpen className="size-5 text-amber-500" />
          <CardTitle className="text-lg">Project Progress</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          No projects yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border-amber-500/20">
      <CardHeader className="flex flex-row items-center gap-2">
        <FolderOpen className="size-5 text-amber-500" />
        <CardTitle className="text-lg">Project Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.map((project, i) => {
          const percent =
            project.totalTodos > 0
              ? Math.round(
                  (project.completedTodos / project.totalTodos) * 100
                )
              : 0
          const color = PROGRESS_COLORS[i % PROGRESS_COLORS.length]
          return (
            <div key={project.id}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium truncate mr-2">
                  {project.name}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {project.completedTodos}/{project.totalTodos} &middot;{" "}
                  {percent}%
                </span>
              </div>
              <div className={`h-2.5 rounded-full ${color.track} overflow-hidden`}>
                <div
                  className={`h-full rounded-full ${color.bar} transition-all duration-500`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
