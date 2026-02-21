import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyStripeWebhook } from "@/lib/payments/stripe";
import { db } from "@/lib/db";
import { subscriptions, paymentHistory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// POST /api/payments/stripe/webhook
// Handles Stripe webhook events. No auth required — Stripe calls this
// endpoint directly. Signature verification ensures authenticity.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body (needed for signature verification)
    const body = await req.text();

    // 2. Get signature from header
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 400 }
      );
    }

    // 3. Get webhook secret from env
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      console.error("STRIPE_WEBHOOK_SECRET is not set");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // 4. Verify signature — verifyStripeWebhook throws on invalid signature
    let event;
    try {
      event = verifyStripeWebhook(body, signature, secret);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // 5. Handle event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspace_id;
        const stripeSubscriptionId = session.subscription as string;

        if (workspaceId && stripeSubscriptionId) {
          await db
            .update(subscriptions)
            .set({
              status: "active",
              payment_provider: "stripe",
              provider_subscription_id: stripeSubscriptionId,
              updated_at: new Date(),
            })
            .where(eq(subscriptions.workspace_id, workspaceId));
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceData = invoice as unknown as Record<string, unknown>;
        const providerSubId = (typeof invoiceData.subscription === "string" ? invoiceData.subscription : null);

        if (providerSubId) {
          // Update period dates
          await db
            .update(subscriptions)
            .set({
              current_period_start: new Date((invoiceData.period_start as number) * 1000),
              current_period_end: new Date((invoiceData.period_end as number) * 1000),
              updated_at: new Date(),
            })
            .where(eq(subscriptions.provider_subscription_id, providerSubId));

          // Record payment
          const sub = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.provider_subscription_id, providerSubId),
          });

          if (sub) {
            await db.insert(paymentHistory).values({
              workspace_id: sub.workspace_id,
              subscription_id: sub.id,
              amount: (invoiceData.amount_paid as number) ?? 0,
              currency: ((invoiceData.currency as string) ?? "usd").toUpperCase(),
              provider: "stripe",
              provider_payment_id: invoice.id,
              status: "captured",
              description: "Subscription payment",
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await db
          .update(subscriptions)
          .set({
            status: "cancelled",
            updated_at: new Date(),
          })
          .where(eq(subscriptions.provider_subscription_id, subscription.id));
        break;
      }

      default:
        // Unknown event type — no-op, just acknowledge
        break;
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
