"use server"

import { db } from "@/lib/db"
import { notificationPreferences } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export async function getNotificationPreferences(userId: string, workspaceId: string) {
  return db.query.notificationPreferences.findFirst({
    where: and(
      eq(notificationPreferences.user_id, userId),
      eq(notificationPreferences.workspace_id, workspaceId)
    ),
  })
}

export async function updateNotificationPreferences(
  userId: string,
  workspaceId: string,
  data: { muted?: boolean; mutedTypes?: string[] }
) {
  const existing = await getNotificationPreferences(userId, workspaceId)

  if (existing) {
    const [updated] = await db
      .update(notificationPreferences)
      .set({
        ...(data.muted !== undefined && { muted: data.muted }),
        ...(data.mutedTypes !== undefined && { muted_types: data.mutedTypes }),
        updated_at: new Date(),
      })
      .where(eq(notificationPreferences.id, existing.id))
      .returning()
    return updated
  }

  const [created] = await db
    .insert(notificationPreferences)
    .values({
      user_id: userId,
      workspace_id: workspaceId,
      muted: data.muted ?? false,
      muted_types: data.mutedTypes ?? [],
      updated_at: new Date(),
    })
    .returning()
  return created
}
