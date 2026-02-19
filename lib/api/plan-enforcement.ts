"use server";

import { db } from "@/lib/db";
import { workspaceMembers, projects } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { getSubscription, isSubscriptionActive, getPlanLimits } from "./subscriptions";

export type EnforcementResult = {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
};

export async function canAddMember(workspaceId: string): Promise<EnforcementResult> {
  const sub = await getSubscription(workspaceId);
  if (!sub) return { allowed: false, reason: "No active subscription" };
  if (!(await isSubscriptionActive(sub))) return { allowed: false, reason: "Subscription is not active" };

  const limits = await getPlanLimits(sub.plan);
  if (limits.maxUsers === -1) return { allowed: true };

  const [result] = await db
    .select({ count: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspace_id, workspaceId));

  const current = result.count;
  if (current >= limits.maxUsers) {
    return { allowed: false, reason: `Plan limit reached (${current}/${limits.maxUsers} members)`, currentUsage: current, limit: limits.maxUsers };
  }

  return { allowed: true, currentUsage: current, limit: limits.maxUsers };
}

export async function canAddProject(workspaceId: string): Promise<EnforcementResult> {
  const sub = await getSubscription(workspaceId);
  if (!sub) return { allowed: false, reason: "No active subscription" };
  if (!(await isSubscriptionActive(sub))) return { allowed: false, reason: "Subscription is not active" };

  const limits = await getPlanLimits(sub.plan);
  if (limits.maxProjects === -1) return { allowed: true };

  const [result] = await db
    .select({ count: count() })
    .from(projects)
    .where(eq(projects.workspace_id, workspaceId));

  const current = result.count;
  if (current >= limits.maxProjects) {
    return { allowed: false, reason: `Plan limit reached (${current}/${limits.maxProjects} projects)`, currentUsage: current, limit: limits.maxProjects };
  }

  return { allowed: true, currentUsage: current, limit: limits.maxProjects };
}

export async function canCreateWorkspace(userId: string): Promise<EnforcementResult> {
  const ownedWorkspaces = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.user_id, userId),
  });

  const workspaceCount = ownedWorkspaces.length;
  let maxWorkspaces = 1;

  for (const membership of ownedWorkspaces) {
    const sub = await getSubscription(membership.workspace_id);
    if (sub && (await isSubscriptionActive(sub))) {
      const limits = await getPlanLimits(sub.plan);
      if (limits.maxWorkspaces === -1) return { allowed: true };
      if (limits.maxWorkspaces > maxWorkspaces) {
        maxWorkspaces = limits.maxWorkspaces;
      }
    }
  }

  if (workspaceCount >= maxWorkspaces) {
    return { allowed: false, reason: `Plan limit reached (${workspaceCount}/${maxWorkspaces} workspaces)`, currentUsage: workspaceCount, limit: maxWorkspaces };
  }

  return { allowed: true, currentUsage: workspaceCount, limit: maxWorkspaces };
}

export async function requireActiveSubscription(workspaceId: string): Promise<void> {
  const sub = await getSubscription(workspaceId);
  if (!sub) throw new Error("No subscription found. Please subscribe to a plan.");
  if (!(await isSubscriptionActive(sub))) {
    throw new Error("Your subscription has expired. Please upgrade to continue.");
  }
}
