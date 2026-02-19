import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { db } from "@/lib/db";
import { subscriptions, paymentHistory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// POST /api/payments/razorpay/webhook
// Handles Razorpay webhook events. No auth required — Razorpay calls this
// endpoint directly. Signature verification ensures authenticity.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body (needed for signature verification)
    const body = await req.text();

    // 2. Get signature from header
    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 400 }
      );
    }

    // 3. Get webhook secret from env
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not set");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // 4. Verify signature
    const isValid = verifyWebhookSignature(body, signature, secret);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // 5. Parse the event payload
    const event = JSON.parse(body);

    // 6. Handle event types
    switch (event.event) {
      case "subscription.activated": {
        const rzSub = event.payload.subscription.entity;
        await db
          .update(subscriptions)
          .set({
            status: "active",
            current_period_start: new Date(rzSub.current_start * 1000),
            current_period_end: new Date(rzSub.current_end * 1000),
            updated_at: new Date(),
          })
          .where(eq(subscriptions.provider_subscription_id, rzSub.id));
        break;
      }

      case "subscription.charged": {
        const rzSub = event.payload.subscription.entity;
        const payment = event.payload.payment?.entity;

        // Update period dates
        await db
          .update(subscriptions)
          .set({
            current_period_start: new Date(rzSub.current_start * 1000),
            current_period_end: new Date(rzSub.current_end * 1000),
            updated_at: new Date(),
          })
          .where(eq(subscriptions.provider_subscription_id, rzSub.id));

        // Record payment if present
        if (payment) {
          const sub = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.provider_subscription_id, rzSub.id),
          });
          if (sub) {
            await db.insert(paymentHistory).values({
              workspace_id: sub.workspace_id,
              subscription_id: sub.id,
              amount: payment.amount,
              currency: (payment.currency ?? "inr").toUpperCase(),
              provider: "razorpay",
              provider_payment_id: payment.id,
              status: "captured",
              description: "Subscription renewal",
            });
          }
        }
        break;
      }

      case "subscription.cancelled": {
        const rzSub = event.payload.subscription.entity;
        await db
          .update(subscriptions)
          .set({
            status: "cancelled",
            cancel_at_period_end: true,
            updated_at: new Date(),
          })
          .where(eq(subscriptions.provider_subscription_id, rzSub.id));
        break;
      }

      case "payment.captured": {
        const payment = event.payload.payment.entity;
        const notes = payment.notes ?? {};

        if (notes.workspace_id) {
          const sub = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.workspace_id, notes.workspace_id),
          });
          if (sub) {
            await db.insert(paymentHistory).values({
              workspace_id: notes.workspace_id,
              subscription_id: sub.id,
              amount: payment.amount,
              currency: (payment.currency ?? "inr").toUpperCase(),
              provider: "razorpay",
              provider_payment_id: payment.id,
              status: "captured",
              description: `Payment for ${notes.plan_slug ?? "subscription"}`,
            });
          }
        }
        break;
      }

      default:
        // Unknown event type — no-op, just acknowledge
        break;
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
