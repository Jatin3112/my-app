"use server"

import { db } from "@/lib/db"
import { notifications, notificationPreferences, workspaceMembers } from "@/lib/db/schema"
import { eq, and, desc, count, ne } from "drizzle-orm"

export async function createNotification(
  workspaceId: string,
  actorId: string,
  type: string,
  entityType: string,
  entityId: string,
  message: string
) {
  // Get workspace members except the actor in a single query
  const recipients = await db
    .select({ user_id: workspaceMembers.user_id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspace_id, workspaceId),
        ne(workspaceMembers.user_id, actorId)
      )
    )

  if (recipients.length === 0) return

  // Single query to get all preferences for this workspace
  const prefs = await db.query.notificationPreferences.findMany({
    where: eq(notificationPreferences.workspace_id, workspaceId),
  })
  const prefsMap = new Map(prefs.map((p) => [p.user_id, p]))

  const eligibleRecipients = recipients.filter((r) => {
    const pref = prefsMap.get(r.user_id)
    if (!pref) return true
    if (pref.muted) return false
    if (pref.muted_types && (pref.muted_types as string[]).includes(type)) return false
    return true
  })

  if (eligibleRecipients.length === 0) return

  // Batch insert notifications
  const values = eligibleRecipients.map((r) => ({
    workspace_id: workspaceId,
    recipient_id: r.user_id,
    actor_id: actorId,
    type,
    entity_type: entityType,
    entity_id: entityId,
    message,
  }))

  await db.insert(notifications).values(values)
}

export async function getNotifications(
  userId: string,
  workspaceId: string,
  options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
) {
  const { unreadOnly = false, limit = 50, offset = 0 } = options

  const conditions = [
    eq(notifications.workspace_id, workspaceId),
    eq(notifications.recipient_id, userId),
  ]

  if (unreadOnly) {
    conditions.push(eq(notifications.is_read, false))
  }

  return db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: [desc(notifications.created_at)],
    limit,
    offset,
  })
}

export async function getUnreadCount(userId: string, workspaceId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.workspace_id, workspaceId),
        eq(notifications.recipient_id, userId),
        eq(notifications.is_read, false)
      )
    )
  return result.count
}

export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ is_read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.recipient_id, userId)))
}

export async function markAllAsRead(userId: string, workspaceId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ is_read: true })
    .where(
      and(
        eq(notifications.workspace_id, workspaceId),
        eq(notifications.recipient_id, userId),
        eq(notifications.is_read, false)
      )
    )
}
