"use server"

import { db } from "@/lib/db"
import { users, workspaces, workspaceMembers, subscriptions } from "@/lib/db/schema"
import { eq, count } from "drizzle-orm"

export function isAdmin(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS
  if (!adminEmails) return false
  return adminEmails.split(",").map((e) => e.trim()).includes(email)
}

export async function getAdminStats() {
  const [userCount, workspaceCount, activeTrials, activeSubscriptions] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(workspaces),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "trialing")),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
  ])

  return {
    totalUsers: userCount[0].count,
    totalWorkspaces: workspaceCount[0].count,
    activeTrials: activeTrials[0].count,
    activeSubscriptions: activeSubscriptions[0].count,
  }
}

export async function getWorkspaceList() {
  const result = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      owner_id: workspaces.owner_id,
      created_at: workspaces.created_at,
    })
    .from(workspaces)
    .orderBy(workspaces.created_at)

  const enriched = await Promise.all(
    result.map(async (ws) => {
      const [memberCount, sub] = await Promise.all([
        db.select({ count: count() }).from(workspaceMembers).where(eq(workspaceMembers.workspace_id, ws.id)),
        db.query.subscriptions.findFirst({
          where: eq(subscriptions.workspace_id, ws.id),
          with: { plan: true },
          orderBy: (s: typeof subscriptions.$inferSelect, { desc }: { desc: (col: unknown) => unknown }) => [desc(s.created_at)],
        }),
      ])
      return {
        ...ws,
        memberCount: memberCount[0].count,
        planName: (sub as Record<string, unknown>)?.plan ? ((sub as Record<string, unknown>).plan as Record<string, unknown>).name as string : "None",
        status: sub?.status || "none",
        trialEnd: sub?.trial_end,
      }
    }),
  )

  return enriched
}

export async function extendTrial(workspaceId: string, days: number) {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspace_id, workspaceId),
    orderBy: (s: typeof subscriptions.$inferSelect, { desc }: { desc: (col: unknown) => unknown }) => [desc(s.created_at)],
  })
  if (!sub) throw new Error("No subscription found")

  const newEnd = new Date(sub.trial_end || new Date())
  newEnd.setDate(newEnd.getDate() + days)

  await db.update(subscriptions)
    .set({ trial_end: newEnd, status: "trialing", updated_at: new Date() })
    .where(eq(subscriptions.id, sub.id))

  return { success: true, newTrialEnd: newEnd }
}

export async function changeWorkspacePlan(workspaceId: string, planId: string) {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspace_id, workspaceId),
    orderBy: (s: typeof subscriptions.$inferSelect, { desc }: { desc: (col: unknown) => unknown }) => [desc(s.created_at)],
  })
  if (!sub) throw new Error("No subscription found")

  await db.update(subscriptions)
    .set({ plan_id: planId, updated_at: new Date() })
    .where(eq(subscriptions.id, sub.id))

  return { success: true }
}
