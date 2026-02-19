"use server";

import { db } from "@/lib/db";
import { subscriptions, plans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSubscription } from "./subscriptions";
import { updateRazorpaySubscription, cancelRazorpaySubscription } from "@/lib/payments/razorpay";

export async function changePlan(workspaceId: string, newPlanSlug: string) {
  const sub = await getSubscription(workspaceId);
  if (!sub) throw new Error("No subscription found");
  if (!sub.provider_subscription_id) throw new Error("No Razorpay subscription linked");

  const newPlan = await db.query.plans.findFirst({
    where: eq(plans.slug, newPlanSlug),
  });
  if (!newPlan || !newPlan.razorpay_plan_id) throw new Error("Plan not found or not configured");

  // Update in Razorpay (handles proration natively)
  await updateRazorpaySubscription(sub.provider_subscription_id, newPlan.razorpay_plan_id);

  // Update our DB
  await db.update(subscriptions)
    .set({ plan_id: newPlan.id, updated_at: new Date() })
    .where(eq(subscriptions.id, sub.id));

  return { success: true, newPlan: newPlan.name };
}

export async function cancelSubscription(workspaceId: string) {
  const sub = await getSubscription(workspaceId);
  if (!sub) throw new Error("No subscription found");
  if (!sub.provider_subscription_id) throw new Error("No Razorpay subscription linked");

  // Cancel at end of billing period
  await cancelRazorpaySubscription(sub.provider_subscription_id, true);

  await db.update(subscriptions)
    .set({ cancel_at_period_end: true, updated_at: new Date() })
    .where(eq(subscriptions.id, sub.id));

  return { success: true };
}
