"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckSquare, Clock, Activity } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { DashboardData } from "@/lib/api/loaders"

interface RecentActivityProps {
  items: DashboardData["recentActivity"]
}

export function RecentActivity({ items }: RecentActivityProps) {
  if (items.length === 0) {
    return (
      <Card className="rounded-xl border-pink-500/20">
        <CardHeader className="flex flex-row items-center gap-2">
          <Activity className="size-5 text-pink-500" />
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          No activity yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border-pink-500/20">
      <CardHeader className="flex flex-row items-center gap-2">
        <Activity className="size-5 text-pink-500" />
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div
              className={`mt-0.5 p-1.5 rounded-lg ${
                item.type === "todo"
                  ? "bg-blue-500/15 text-blue-400"
                  : "bg-violet-500/15 text-violet-400"
              }`}
            >
              {item.type === "todo" ? (
                <CheckSquare className="size-4" />
              ) : (
                <Clock className="size-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(item.timestamp), {
                addSuffix: true,
              })}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
