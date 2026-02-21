"use server";

import { db } from "@/lib/db";
import { workspaces, workspaceMembers, type Workspace } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/permissions";
import { cached, cacheDel, cacheInvalidate } from "@/lib/cache";
import { createTrialSubscription } from "./subscriptions";
import { canCreateWorkspace } from "./plan-enforcement";
import { sanitizeText } from "@/lib/api/sanitize";

// ---------------------------------------------------------------------------
// Helper: generate a URL-friendly slug from a workspace name
// ---------------------------------------------------------------------------

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = Math.random().toString(36).substring(2, 8);

  return `${base}-${suffix}`;
}

// ---------------------------------------------------------------------------
// Create a new workspace and make the creator the owner
// ---------------------------------------------------------------------------

export async function createWorkspace(
  userId: string,
  data: { name: string },
): Promise<Workspace> {
  const wsCheck = await canCreateWorkspace(userId);
  if (!wsCheck.allowed) throw new Error(wsCheck.reason);

  const sanitizedName = sanitizeText(data.name);
  const slug = generateSlug(sanitizedName);

  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: sanitizedName,
      slug,
      owner_id: userId,
    })
    .returning();

  await db.insert(workspaceMembers).values({
    workspace_id: workspace.id,
    user_id: userId,
    role: "owner",
  });

  await createTrialSubscription(workspace.id);

  await cacheDel(`workspaces:${userId}`);

  return workspace;
}

// ---------------------------------------------------------------------------
// Get all workspaces a user belongs to (with their role in each)
// ---------------------------------------------------------------------------

export async function getWorkspacesForUser(userId: string) {
  return cached(`workspaces:${userId}`, 300, async () => {
    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.user_id, userId),
      with: {
        workspace: true,
      },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));
  });
}

// ---------------------------------------------------------------------------
// Get a single workspace by its id
// ---------------------------------------------------------------------------

export async function getWorkspaceById(
  workspaceId: string,
): Promise<Workspace | undefined> {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  return workspace;
}

// ---------------------------------------------------------------------------
// Update a workspace (requires workspace:update permission)
// ---------------------------------------------------------------------------

export async function updateWorkspace(
  userId: string,
  workspaceId: string,
  data: { name: string },
): Promise<Workspace> {
  await requirePermission(userId, workspaceId, "workspace:update");

  const [updated] = await db
    .update(workspaces)
    .set({
      name: sanitizeText(data.name),
      updated_at: new Date(),
    })
    .where(eq(workspaces.id, workspaceId))
    .returning();

  await cacheInvalidate("workspaces:*");

  return updated;
}

// ---------------------------------------------------------------------------
// Delete a workspace (requires workspace:delete permission)
// ---------------------------------------------------------------------------

export async function deleteWorkspace(
  userId: string,
  workspaceId: string,
): Promise<void> {
  await requirePermission(userId, workspaceId, "workspace:delete");

  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));

  await cacheInvalidate("workspaces:*");
}
