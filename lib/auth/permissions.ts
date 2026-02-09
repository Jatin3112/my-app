"use server";

import { db } from "@/lib/db";
import { workspaceMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { cached } from "@/lib/cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Role = "owner" | "admin" | "member";

export type Action =
  | "workspace:delete"
  | "workspace:update"
  | "members:invite"
  | "members:remove"
  | "members:change_role"
  | "ownership:transfer"
  | "project:create"
  | "project:edit_any"
  | "project:delete_any"
  | "todo:create"
  | "todo:edit_any"
  | "todo:delete_any"
  | "todo:assign"
  | "todo:view_all"
  | "timesheet:view_all"
  | "timesheet:edit_any"
  | "timesheet:delete_any"
  | "comment:delete_any";

// ---------------------------------------------------------------------------
// Permissions map — which roles are allowed to perform each action
// ---------------------------------------------------------------------------

const PERMISSIONS: Record<Action, Role[]> = {
  "workspace:delete": ["owner"],
  "workspace:update": ["owner", "admin"],
  "members:invite": ["owner", "admin"],
  "members:remove": ["owner", "admin"],
  "members:change_role": ["owner", "admin"],
  "ownership:transfer": ["owner"],
  "project:create": ["owner", "admin", "member"],
  "project:edit_any": ["owner", "admin"],
  "project:delete_any": ["owner", "admin"],
  "todo:create": ["owner", "admin", "member"],
  "todo:edit_any": ["owner", "admin"],
  "todo:delete_any": ["owner", "admin"],
  "todo:assign": ["owner", "admin", "member"],
  "todo:view_all": ["owner", "admin", "member"],
  "timesheet:view_all": ["owner", "admin"],
  "timesheet:edit_any": ["owner", "admin"],
  "timesheet:delete_any": ["owner", "admin"],
  "comment:delete_any": ["owner", "admin"],
};

// ---------------------------------------------------------------------------
// Helper: look up a user's role in a workspace
// ---------------------------------------------------------------------------

export async function getMemberRole(
  userId: string,
  workspaceId: string,
): Promise<Role | null> {
  return cached(`role:${userId}:${workspaceId}`, 60, async () => {
    const [member] = await db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.user_id, userId),
          eq(workspaceMembers.workspace_id, workspaceId),
        ),
      )
      .limit(1);

    if (!member) return null;

    return member.role as Role;
  });
}

// ---------------------------------------------------------------------------
// Check whether a user is allowed to perform an action in a workspace
// ---------------------------------------------------------------------------

export async function checkPermission(
  userId: string,
  workspaceId: string,
  action: Action,
): Promise<{ allowed: boolean; role: Role | null }> {
  const role = await getMemberRole(userId, workspaceId);

  if (!role) {
    return { allowed: false, role: null };
  }

  const allowedRoles = PERMISSIONS[action];
  const allowed = allowedRoles.includes(role);

  return { allowed, role };
}

// ---------------------------------------------------------------------------
// Require permission — throws if not allowed, returns the role if allowed
// ---------------------------------------------------------------------------

export async function requirePermission(
  userId: string,
  workspaceId: string,
  action: Action,
): Promise<Role> {
  const { allowed, role } = await checkPermission(userId, workspaceId, action);

  if (!allowed) {
    throw new Error(`Permission denied: ${action}`);
  }

  return role as Role;
}
