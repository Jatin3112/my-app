"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, X, FolderPlus, ListTodo, Mic, UserPlus } from "lucide-react"
import { dismissOnboarding, type OnboardingStatus } from "@/lib/api/onboarding"
import { toast } from "sonner"

const STEPS = [
  { key: "created_project" as const, label: "Create a project", icon: FolderPlus, href: "/todos" },
  { key: "added_todo" as const, label: "Add a todo", icon: ListTodo, href: "/todos" },
  { key: "tried_voice" as const, label: "Try voice capture", icon: Mic, href: "/todos" },
  { key: "invited_member" as const, label: "Invite a team member", icon: UserPlus, href: "/workspace/settings" },
]

export function OnboardingChecklist({
  status,
  userId,
}: {
  status: OnboardingStatus
  userId: string
}) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || status.dismissed || status.allDone) return null

  async function handleDismiss() {
    setDismissed(true)
    try {
      await dismissOnboarding(userId)
    } catch {
      toast.error("Failed to dismiss")
      setDismissed(false)
    }
  }

  const progress = (status.completed / status.total) * 100

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Getting Started</CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{status.completed} of {status.total} complete</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <div className="space-y-2">
          {STEPS.map((step) => {
            const done = status.steps[step.key]
            const Icon = step.icon
            return (
              <a
                key={step.key}
                href={step.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  done
                    ? "text-muted-foreground line-through"
                    : "hover:bg-muted"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {step.label}
              </a>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
