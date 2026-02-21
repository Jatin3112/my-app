"use server";

import { db } from "@/lib/db";
import { subscriptions, plans, workspaceMembers, projects, workspaces, paymentHistory } from "@/lib/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { cached, cacheDel } from "@/lib/cache";
import type { Plan, Subscription } from "@/lib/db/schema";

// ─── Types ───

export type SubscriptionWithPlan = Subscription & { plan: Plan };

export type PlanLimits = {
  maxUsers: number;
  maxProjects: number;
  maxWorkspaces: number;
  maxStorageMb: number;
  features: string[];
};

export type UsageInfo = {
  currentUsers: number;
  currentProjects: number;
  currentWorkspaces: number;
  limits: PlanLimits;
};

// ─── Queries ───

export async function getSubscription(workspaceId: string): Promise<SubscriptionWithPlan | null> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.workspace_id, workspaceId),
    with: { plan: true },
    orderBy: (s, { desc }) => [desc(s.created_at)],
  });
  return sub ?? null;
}

export async function getPlanBySlug(slug: string): Promise<Plan | null> {
  const plan = await db.query.plans.findFirst({
    where: eq(plans.slug, slug),
  });
  return plan ?? null;
}

export async function getAllPlans(): Promise<Plan[]> {
  return cached("all-plans", 3600, async () => {
    return db.query.plans.findMany({
      where: eq(plans.is_active, true),
      orderBy: (p, { asc }) => [asc(p.price_inr)],
    });
  });
}

// ─── Trial Management ───

export async function createTrialSubscription(workspaceId: string): Promise<Subscription> {
  const agencyPlan = await getPlanBySlug("agency");
  if (!agencyPlan) throw new Error("Agency plan not found. Run db:seed first.");

  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 14);

  const [sub] = await db
    .insert(subscriptions)
    .values({
      workspace_id: workspaceId,
      plan_id: agencyPlan.id,
      status: "trialing",
      trial_start: now,
      trial_end: trialEnd,
    })
    .returning();

  return sub;
}

export async function isTrialExpired(sub: SubscriptionWithPlan): Promise<boolean> {
  if (sub.status !== "trialing") return false;
  if (!sub.trial_end) return false;
  return new Date() > new Date(sub.trial_end);
}

export async function getTrialDaysRemaining(sub: SubscriptionWithPlan): Promise<number> {
  if (sub.status !== "trialing" || !sub.trial_end) return 0;
  const diff = new Date(sub.trial_end).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ─── Plan Limits ───

export async function getPlanLimits(plan: Plan): Promise<PlanLimits> {
  return {
    maxUsers: plan.max_users,
    maxProjects: plan.max_projects,
    maxWorkspaces: plan.max_workspaces,
    maxStorageMb: plan.max_storage_mb,
    features: (plan.features as string[]) ?? [],
  };
}

export async function getUsageInfo(workspaceId: string, userId: string): Promise<UsageInfo> {
  const sub = await getSubscription(workspaceId);

  const defaultLimits: PlanLimits = {
    maxUsers: 1,
    maxProjects: 3,
    maxWorkspaces: 1,
    maxStorageMb: 100,
    features: [],
  };

  if (!sub) {
    return { currentUsers: 0, currentProjects: 0, currentWorkspaces: 0, limits: defaultLimits };
  }

  const limits = await getPlanLimits(sub.plan);

  const [userCount, projectCount, workspaceCount] = await Promise.all([
    db.select({ count: count() }).from(workspaceMembers).where(eq(workspaceMembers.workspace_id, workspaceId)),
    db.select({ count: count() }).from(projects).where(eq(projects.workspace_id, workspaceId)),
    db.select({ count: count() })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.user_id, userId)),
  ]);

  return {
    currentUsers: userCount[0].count,
    currentProjects: projectCount[0].count,
    currentWorkspaces: workspaceCount[0].count,
    limits,
  };
}

// ─── Status Helpers ───

export async function isSubscriptionActive(sub: SubscriptionWithPlan): Promise<boolean> {
  if (sub.status === "active") return true;
  if (sub.status === "trialing" && !(await isTrialExpired(sub))) return true;
  return false;
}

export async function getWorkspaceSubscriptionStatus(workspaceId: string): Promise<{
  isActive: boolean;
  status: string;
  plan: Plan | null;
  trialDaysRemaining: number;
  isTrialing: boolean;
}> {
  const sub = await getSubscription(workspaceId);

  if (!sub) {
    return { isActive: false, status: "none", plan: null, trialDaysRemaining: 0, isTrialing: false };
  }

  const active = await isSubscriptionActive(sub);
  const daysLeft = await getTrialDaysRemaining(sub);

  if (sub.status === "trialing" && (await isTrialExpired(sub))) {
    await db
      .update(subscriptions)
      .set({ status: "expired", updated_at: new Date() })
      .where(eq(subscriptions.id, sub.id));
    return { isActive: false, status: "expired", plan: sub.plan, trialDaysRemaining: 0, isTrialing: false };
  }

  return {
    isActive: active,
    status: sub.status,
    plan: sub.plan,
    trialDaysRemaining: daysLeft,
    isTrialing: sub.status === "trialing",
  };
}

// ─── Payment History ───

export async function getPaymentHistory(workspaceId: string) {
  return db
    .select()
    .from(paymentHistory)
    .where(eq(paymentHistory.workspace_id, workspaceId))
    .orderBy(desc(paymentHistory.created_at))
    .limit(20);
}
