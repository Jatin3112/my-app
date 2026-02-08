"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FolderOpen, ListTodo, CheckCircle, Circle, Clock, CalendarClock, Users } from "lucide-react"
import { getDashboardStats, type DashboardStats } from "@/lib/api/dashboard"
import { useWorkspace } from "@/hooks/use-workspace"

export function StatsCards() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id

  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    if (workspaceId) {
      getDashboardStats(workspaceId).then(setStats).catch(console.error)
    }
  }, [workspaceId])

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Loading...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-12 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const completionPercent = stats.totalTodos > 0
    ? Math.round((stats.completedTodos / stats.totalTodos) * 100)
    : 0

  const statItems = [
    {
      title: "Total Projects",
      value: stats.totalProjects,
      icon: FolderOpen,
      color: "text-blue-500",
    },
    {
      title: "Total Todos",
      value: stats.totalTodos,
      icon: ListTodo,
      color: "text-purple-500",
    },
    {
      title: "Completed",
      value: `${stats.completedTodos}`,
      subtitle: `${completionPercent}%`,
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      title: "Pending",
      value: stats.pendingTodos,
      icon: Circle,
      color: "text-orange-500",
    },
    {
      title: "Total Hours",
      value: stats.totalHoursLogged.toFixed(1),
      icon: Clock,
      color: "text-cyan-500",
    },
    {
      title: "This Week",
      value: `${stats.thisWeekHours.toFixed(1)}h`,
      icon: CalendarClock,
      color: "text-pink-500",
    },
    {
      title: "Members",
      value: stats.totalMembers,
      icon: Users,
      color: "text-indigo-500",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {statItems.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.title}
            </CardTitle>
            <item.icon className={`size-4 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {item.value}
              {item.subtitle && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  ({item.subtitle})
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
