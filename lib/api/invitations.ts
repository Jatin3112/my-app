"use server"

import { db } from "@/lib/db"
import { workspaceInvitations, workspaceMembers, users, workspaces } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { requirePermission, type Role } from "@/lib/auth/permissions"
import { randomBytes } from "crypto"
import { createNotification } from "@/lib/api/notifications"
import { cacheDel } from "@/lib/cache"
import { canAddMember } from "./plan-enforcement"
import { sendEmail } from "@/lib/email"
import { updateOnboardingStep } from "@/lib/api/onboarding"
import { inviteEmailHtml } from "@/lib/email/templates/invite"

export async function inviteMember(
  actorId: string,
  workspaceId: string,
  data: { email: string; role: Role }
): Promise<{ token: string }> {
  await requirePermission(actorId, workspaceId, "members:invite")

  const memberCheck = await canAddMember(workspaceId);
  if (!memberCheck.allowed) throw new Error(memberCheck.reason);

  // Check if already a member
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  })

  if (existingUser) {
    const existingMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, existingUser.id)
      ),
    })
    if (existingMember) {
      throw new Error("User is already a member of this workspace")
    }
  }

  // Check for pending invite
  const existingInvite = await db.query.workspaceInvitations.findFirst({
    where: and(
      eq(workspaceInvitations.workspace_id, workspaceId),
      eq(workspaceInvitations.email, data.email),
      eq(workspaceInvitations.status, "pending")
    ),
  })
  if (existingInvite) {
    throw new Error("An invitation has already been sent to this email")
  }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await db.insert(workspaceInvitations).values({
    workspace_id: workspaceId,
    email: data.email,
    role: data.role,
    invited_by: actorId,
    token,
    status: "pending",
    expires_at: expiresAt,
  })

  // Send invitation email (best-effort, don't block on failure)
  const [inviter, workspace] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, actorId) }),
    db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) }),
  ])
  const inviterName = inviter?.name || inviter?.email || "A teammate"
  const workspaceName = workspace?.name || "a workspace"
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const acceptUrl = `${baseUrl}/invite/${token}`

  sendEmail({
    to: data.email,
    subject: `You've been invited to join ${workspaceName} on VoiceTask`,
    html: inviteEmailHtml({
      workspaceName,
      inviterName,
      acceptUrl,
      role: data.role,
    }),
  }).catch(() => {})

  await updateOnboardingStep(actorId, "invited_member").catch(() => {})

  return { token }
}

export async function getWorkspaceInvitations(workspaceId: string) {
  return db.query.workspaceInvitations.findMany({
    where: and(
      eq(workspaceInvitations.workspace_id, workspaceId),
      eq(workspaceInvitations.status, "pending")
    ),
    with: {
      inviter: true,
    },
  })
}

export async function acceptInvitation(token: string, userId: string) {
  const invitation = await db.query.workspaceInvitations.findFirst({
    where: and(
      eq(workspaceInvitations.token, token),
      eq(workspaceInvitations.status, "pending")
    ),
    with: {
      workspace: true,
    },
  })

  if (!invitation) {
    throw new Error("Invitation not found or already used")
  }

  if (new Date() > invitation.expires_at) {
    await db
      .update(workspaceInvitations)
      .set({ status: "expired" })
      .where(eq(workspaceInvitations.id, invitation.id))
    throw new Error("Invitation has expired")
  }

  // Check not already a member
  const existingMember = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspace_id, invitation.workspace_id),
      eq(workspaceMembers.user_id, userId)
    ),
  })
  if (existingMember) {
    throw new Error("You are already a member of this workspace")
  }

  // Add as member
  await db.insert(workspaceMembers).values({
    workspace_id: invitation.workspace_id,
    user_id: userId,
    role: invitation.role,
  })

  // Mark invitation as accepted
  await db
    .update(workspaceInvitations)
    .set({ status: "accepted" })
    .where(eq(workspaceInvitations.id, invitation.id))

  await cacheDel(`workspaces:${userId}`, `stats:${invitation.workspace_id}`)

  const newMember = await db.query.users.findFirst({ where: eq(users.id, userId) })
  const memberName = newMember?.name || newMember?.email || "Someone"
  await createNotification(invitation.workspace_id, userId, "member_joined", "workspace", invitation.workspace_id, `${memberName} joined the workspace`)
    .catch(() => {})

  return { workspaceId: invitation.workspace_id, workspaceName: invitation.workspace.name }
}

export async function cancelInvitation(
  actorId: string,
  workspaceId: string,
  invitationId: string
): Promise<void> {
  await requirePermission(actorId, workspaceId, "members:invite")

  await db
    .delete(workspaceInvitations)
    .where(eq(workspaceInvitations.id, invitationId))
}
