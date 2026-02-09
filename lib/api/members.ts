"use server"

import { db } from "@/lib/db"
import { workspaceMembers, workspaces, users } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { requirePermission, getMemberRole, type Role } from "@/lib/auth/permissions"
import { createNotification } from "@/lib/api/notifications"
import { cacheDel } from "@/lib/cache"

export async function getWorkspaceMembers(workspaceId: string) {
  const members = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspace_id, workspaceId),
    with: {
      user: true,
    },
  })

  return members.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    name: m.user.name,
    email: m.user.email,
  }))
}

export async function removeMember(
  actorId: string,
  workspaceId: string,
  targetUserId: string
): Promise<void> {
  await requirePermission(actorId, workspaceId, "members:remove")

  const targetRole = await getMemberRole(targetUserId, workspaceId)
  if (targetRole === "owner") {
    throw new Error("Cannot remove the workspace owner")
  }

  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, targetUserId)
      )
    )

  await cacheDel(
    `role:${targetUserId}:${workspaceId}`,
    `workspaces:${targetUserId}`,
    `stats:${workspaceId}`,
  )

  const actor = await db.query.users.findFirst({ where: eq(users.id, actorId) })
  const target = await db.query.users.findFirst({ where: eq(users.id, targetUserId) })
  const actorName = actor?.name || actor?.email || "Someone"
  const targetName = target?.name || target?.email || "a member"
  await createNotification(workspaceId, actorId, "member_removed", "workspace", workspaceId, `${actorName} removed ${targetName} from the workspace`)
    .catch(() => {})
}

export async function updateMemberRole(
  actorId: string,
  workspaceId: string,
  targetUserId: string,
  newRole: Role
): Promise<void> {
  await requirePermission(actorId, workspaceId, "members:change_role")

  const targetRole = await getMemberRole(targetUserId, workspaceId)
  if (targetRole === "owner") {
    throw new Error("Cannot change the owner's role")
  }
  if (newRole === "owner") {
    throw new Error("Use transferOwnership to change owner")
  }

  await db
    .update(workspaceMembers)
    .set({ role: newRole })
    .where(
      and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, targetUserId)
      )
    )

  await cacheDel(`role:${targetUserId}:${workspaceId}`)

  const actor = await db.query.users.findFirst({ where: eq(users.id, actorId) })
  const target = await db.query.users.findFirst({ where: eq(users.id, targetUserId) })
  const actorName = actor?.name || actor?.email || "Someone"
  const targetName = target?.name || target?.email || "a member"
  await createNotification(workspaceId, actorId, "role_changed", "workspace", workspaceId, `${actorName} changed ${targetName}'s role to ${newRole}`)
    .catch(() => {})
}

export async function transferOwnership(
  currentOwnerId: string,
  workspaceId: string,
  newOwnerId: string
): Promise<void> {
  await requirePermission(currentOwnerId, workspaceId, "ownership:transfer")

  const newOwnerRole = await getMemberRole(newOwnerId, workspaceId)
  if (!newOwnerRole) {
    throw new Error("Target user is not a member of this workspace")
  }

  // Demote current owner to admin
  await db
    .update(workspaceMembers)
    .set({ role: "admin" })
    .where(
      and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, currentOwnerId)
      )
    )

  // Promote new owner
  await db
    .update(workspaceMembers)
    .set({ role: "owner" })
    .where(
      and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, newOwnerId)
      )
    )

  // Update workspace owner_id
  await db
    .update(workspaces)
    .set({ owner_id: newOwnerId, updated_at: new Date() })
    .where(eq(workspaces.id, workspaceId))

  await cacheDel(
    `role:${currentOwnerId}:${workspaceId}`,
    `role:${newOwnerId}:${workspaceId}`,
    `workspaces:${currentOwnerId}`,
    `workspaces:${newOwnerId}`,
    `stats:${workspaceId}`,
  )
}

export async function leaveWorkspace(userId: string, workspaceId: string): Promise<void> {
  const role = await getMemberRole(userId, workspaceId)
  if (role === "owner") {
    throw new Error("Owner cannot leave. Transfer ownership first.")
  }

  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, userId)
      )
    )

  await cacheDel(
    `role:${userId}:${workspaceId}`,
    `workspaces:${userId}`,
    `stats:${workspaceId}`,
  )
}
