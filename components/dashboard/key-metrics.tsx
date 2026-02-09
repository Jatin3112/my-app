"use client"

import { ListTodo, CheckCircle, CalendarClock, Users, FolderOpen } from "lucide-react"
import type { DashboardData } from "@/lib/api/loaders"

type Stats = DashboardData["stats"]

const metrics = [
  {
    key: "totalProjects",
    label: "Total Projects",
    icon: FolderOpen,
    gradient: "from-cyan-600 to-cyan-400",
    shadowColor: "shadow-cyan-500/25",
    getValue: (s: Stats) => s.totalProjects,
    getSubtitle: (s: Stats) => `${s.totalMembers} members`,
  },
  {
    key: "totalTasks",
    label: "Total Tasks",
    icon: ListTodo,
    gradient: "from-blue-600 to-blue-400",
    shadowColor: "shadow-blue-500/25",
    getValue: (s: Stats) => s.totalTodos,
    getSubtitle: (s: Stats) => `${s.completedTodos} completed`,
  },
  {
    key: "completionRate",
    label: "Completion Rate",
    icon: CheckCircle,
    gradient: "from-emerald-600 to-emerald-400",
    shadowColor: "shadow-emerald-500/25",
    getValue: (s: Stats) =>
      s.totalTodos > 0
        ? `${Math.round((s.completedTodos / s.totalTodos) * 100)}%`
        : "0%",
    getSubtitle: (_s: Stats) => "of all tasks",
    getProgress: (s: Stats) =>
      s.totalTodos > 0
        ? Math.round((s.completedTodos / s.totalTodos) * 100)
        : 0,
  },
  {
    key: "hoursThisWeek",
    label: "Hours This Week",
    icon: CalendarClock,
    gradient: "from-violet-600 to-violet-400",
    shadowColor: "shadow-violet-500/25",
    getValue: (s: Stats) => s.thisWeekHours.toFixed(1),
    getSubtitle: (s: Stats) => `of ${s.totalHoursLogged.toFixed(1)} total`,
  },
  {
    key: "teamMembers",
    label: "Team Members",
    icon: Users,
    gradient: "from-amber-600 to-amber-400",
    shadowColor: "shadow-amber-500/25",
    getValue: (s: Stats) => s.totalMembers,
    getSubtitle: (s: Stats) => `across ${s.totalProjects} projects`,
  },
] as const

interface KeyMetricsProps {
  stats: Stats | null
}

export function KeyMetrics({ stats }: KeyMetricsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-card p-6">
            <div className="h-24 bg-muted animate-pulse rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map((m) => {
        const Icon = m.icon
        const progress = "getProgress" in m ? m.getProgress(stats) : null
        return (
          <div
            key={m.key}
            className={`rounded-xl bg-gradient-to-br ${m.gradient} ${m.shadowColor} shadow-lg p-5 text-white relative overflow-hidden`}
          >
            {/* Decorative circle */}
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-5 -right-5 w-16 h-16 rounded-full bg-white/5" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="size-4 text-white/80" />
                <span className="text-xs font-medium text-white/80">
                  {m.label}
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight">
                {m.getValue(stats)}
              </div>
              <p className="text-xs text-white/70 mt-1">
                {m.getSubtitle(stats)}
              </p>
              {progress !== null && (
                <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
