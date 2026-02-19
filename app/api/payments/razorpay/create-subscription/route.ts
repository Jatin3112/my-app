import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db";
import { plans, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createRazorpaySubscription } from "@/lib/payments/razorpay";
import { getSubscription } from "@/lib/api/subscriptions";

export async function POST(req: NextRequest) {
  try {
    // 1. Validate session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // 2. Parse and validate body
    const body = await req.json();
    const { planSlug, workspaceId } = body;

    if (!planSlug || !workspaceId) {
      return NextResponse.json(
        { error: "Missing required fields: planSlug and workspaceId" },
        { status: 400 }
      );
    }

    // 3. Look up plan by slug
    const plan = await db.query.plans.findFirst({
      where: eq(plans.slug, planSlug),
    });

    if (!plan || !plan.razorpay_plan_id) {
      return NextResponse.json(
        { error: "Plan not found or Razorpay plan not configured" },
        { status: 400 }
      );
    }

    // 4. Create Razorpay subscription
    const rzSub = await createRazorpaySubscription({
      planId: plan.razorpay_plan_id,
      totalCount: 12,
      customerNotify: 1,
      notes: {
        workspace_id: workspaceId,
        user_id: userId,
        plan_slug: planSlug,
      },
    });

    // 5. Upsert subscription record in DB
    const existingSub = await getSubscription(workspaceId);

    if (existingSub) {
      await db
        .update(subscriptions)
        .set({
          plan_id: plan.id,
          payment_provider: "razorpay",
          provider_subscription_id: rzSub.id,
          updated_at: new Date(),
        })
        .where(eq(subscriptions.id, existingSub.id));
    } else {
      await db.insert(subscriptions).values({
        workspace_id: workspaceId,
        plan_id: plan.id,
        status: "pending",
        payment_provider: "razorpay",
        provider_subscription_id: rzSub.id,
      });
    }

    // 6. Return success
    return NextResponse.json({
      subscriptionId: rzSub.id,
      shortUrl: rzSub.short_url,
    });
  } catch (error) {
    console.error("Error creating Razorpay subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
