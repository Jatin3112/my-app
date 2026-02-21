"use server"

import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

type OnboardingStep = "created_project" | "added_todo" | "tried_voice" | "invited_member"

const ALL_STEPS: OnboardingStep[] = ["created_project", "added_todo", "tried_voice", "invited_member"]

type OnboardingData = {
  created_project?: boolean
  added_todo?: boolean
  tried_voice?: boolean
  invited_member?: boolean
  dismissed?: boolean
}

export type OnboardingStatus = {
  steps: Record<OnboardingStep, boolean>
  completed: number
  total: number
  dismissed: boolean
  allDone: boolean
}

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { onboarding: true },
  })

  const data = (user?.onboarding as OnboardingData) || {}

  const steps = ALL_STEPS.reduce((acc, step) => {
    acc[step] = !!data[step]
    return acc
  }, {} as Record<OnboardingStep, boolean>)

  const completed = ALL_STEPS.filter((s) => steps[s]).length

  return {
    steps,
    completed,
    total: ALL_STEPS.length,
    dismissed: !!data.dismissed,
    allDone: completed === ALL_STEPS.length,
  }
}

export async function updateOnboardingStep(userId: string, step: OnboardingStep): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { onboarding: true },
  })

  const current = (user?.onboarding as OnboardingData) || {}
  await db.update(users)
    .set({ onboarding: { ...current, [step]: true } })
    .where(eq(users.id, userId))
}

export async function dismissOnboarding(userId: string): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { onboarding: true },
  })

  const current = (user?.onboarding as OnboardingData) || {}
  await db.update(users)
    .set({ onboarding: { ...current, dismissed: true } })
    .where(eq(users.id, userId))
}
