import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db";
import { plans, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createCheckoutSession,
  createStripeCustomer,
} from "@/lib/payments/stripe";

export async function POST(req: NextRequest) {
  try {
    // 1. Validate session
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user!.id;
    const userEmail: string = session.user?.email ?? "";

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

    if (!plan || !plan.stripe_price_id) {
      return NextResponse.json(
        { error: "Plan not found or Stripe price not configured" },
        { status: 400 }
      );
    }

    // 4. Get workspace + ensure Stripe customer exists
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    let customerId = workspace?.stripe_customer_id ?? null;

    if (!customerId) {
      customerId = await createStripeCustomer(
        userEmail,
        session.user?.name ?? undefined
      );

      await db
        .update(workspaces)
        .set({ stripe_customer_id: customerId })
        .where(eq(workspaces.id, workspaceId));
    }

    // 5. Create Stripe checkout session
    const baseUrl =
      process.env.NEXTAUTH_URL || "http://localhost:3000";

    const checkoutResult = await createCheckoutSession({
      priceId: plan.stripe_price_id,
      customerId,
      workspaceId,
      successUrl: `${baseUrl}/billing?success=true`,
      cancelUrl: `${baseUrl}/billing?canceled=true`,
    });

    // 6. Return success
    return NextResponse.json({
      sessionId: checkoutResult.sessionId,
      url: checkoutResult.url,
    });
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
