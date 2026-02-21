"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useSession } from "next-auth/react"
import { AppShell } from "@/components/layout/app-shell"
import { KeyMetrics } from "@/components/dashboard/key-metrics"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { ProjectProgress } from "@/components/dashboard/project-progress"
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist"
import { useWorkspace } from "@/hooks/use-workspace"
import { loadHomePageData, type DashboardData } from "@/lib/api/loaders"
import { LayoutDashboard } from "lucide-react"

const TodoCompletionChart = dynamic(
  () => import("@/components/dashboard/charts/todo-completion-chart").then(m => m.TodoCompletionChart),
  { ssr: false, loading: () => <div className="h-[300px] rounded-xl bg-muted animate-pulse" /> }
)
const HoursByProjectChart = dynamic(
  () => import("@/components/dashboard/charts/hours-by-project-chart").then(m => m.HoursByProjectChart),
  { ssr: false, loading: () => <div className="h-[300px] rounded-xl bg-muted animate-pulse" /> }
)
const WeeklyActivityChart = dynamic(
  () => import("@/components/dashboard/charts/weekly-activity-chart").then(m => m.WeeklyActivityChart),
  { ssr: false, loading: () => <div className="h-[300px] rounded-xl bg-muted animate-pulse" /> }
)

const STORAGE_KEY = "last-workspace-id"

export default function Home() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const userName = session?.user?.name || "there"
  const { seedWorkspaces, currentWorkspace } = useWorkspace()
  const workspaceName = currentWorkspace?.name || "your workspace"

  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    if (!userId) return
    const lastId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : undefined
    loadHomePageData(userId, userName, lastId || undefined).then(({ workspaces, currentWorkspace: current, ...dashboardData }) => {
      seedWorkspaces(workspaces, current)
      setData(dashboardData)
      // Persist the selected workspace
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, current.id)
      }
    }).catch(console.error)
  }, [userId, userName, seedWorkspaces])

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Greeting */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/15">
            <LayoutDashboard className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {userName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening in {workspaceName}
            </p>
          </div>
        </div>

        {/* Onboarding Checklist */}
        {data?.onboarding && userId && (
          <OnboardingChecklist status={data.onboarding} userId={userId} />
        )}

        {/* Key Metrics */}
        <KeyMetrics stats={data?.stats ?? null} />

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-6">
          <TodoCompletionChart
            completed={data?.stats?.completedTodos ?? 0}
            pending={data?.stats?.pendingTodos ?? 0}
          />
          <HoursByProjectChart data={data?.chartData?.hoursByProject ?? []} />
        </div>

        {/* Weekly Activity — full width */}
        <WeeklyActivityChart data={data?.chartData?.dailyHours ?? []} />

        {/* Bottom row */}
        <div className="grid md:grid-cols-2 gap-6">
          <RecentActivity items={data?.recentActivity ?? []} />
          <ProjectProgress projects={data?.projectProgress ?? []} />
        </div>
      </div>
    </AppShell>
  )
}
