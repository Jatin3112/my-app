import Razorpay from "razorpay";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Lazy singleton Razorpay client
// ---------------------------------------------------------------------------

let razorpayInstance: InstanceType<typeof Razorpay> | null = null;

export function getRazorpay(): InstanceType<typeof Razorpay> {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error(
        "Missing Razorpay credentials. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables."
      );
    }

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayInstance;
}

// ---------------------------------------------------------------------------
// Webhook signature verification (HMAC-SHA256, timing-safe)
// ---------------------------------------------------------------------------

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    // Both must be the same length for timingSafeEqual
    const expected = Buffer.from(expectedSignature, "hex");
    const received = Buffer.from(signature, "hex");

    if (expected.length !== received.length) {
      return false;
    }

    return crypto.timingSafeEqual(expected, received);
  } catch {
    // If the signature is malformed (e.g. not valid hex), reject it
    return false;
  }
}

// ---------------------------------------------------------------------------
// Plan helpers
// ---------------------------------------------------------------------------

interface CreatePlanOptions {
  name: string;
  /** Amount in paise (e.g. 49900 for INR 499) */
  amount: number;
  currency: string;
  period: "monthly";
  interval: number;
}

export async function createRazorpayPlan(
  opts: CreatePlanOptions
): Promise<string> {
  const rz = getRazorpay();

  const plan = await (rz.plans as any).create({
    period: opts.period,
    interval: opts.interval,
    item: {
      name: opts.name,
      amount: opts.amount,
      currency: opts.currency,
    },
  });

  return plan.id as string;
}

// ---------------------------------------------------------------------------
// Subscription helpers
// ---------------------------------------------------------------------------

interface CreateSubscriptionOptions {
  planId: string;
  totalCount: number;
  customerNotify: 0 | 1;
  notes?: Record<string, string>;
}

interface CreateSubscriptionResult {
  id: string;
  short_url: string;
}

export async function createRazorpaySubscription(
  opts: CreateSubscriptionOptions
): Promise<CreateSubscriptionResult> {
  const rz = getRazorpay();

  const subscription = await (rz.subscriptions as any).create({
    plan_id: opts.planId,
    total_count: opts.totalCount,
    customer_notify: opts.customerNotify,
    ...(opts.notes ? { notes: opts.notes } : {}),
  });

  return {
    id: subscription.id as string,
    short_url: subscription.short_url as string,
  };
}

export async function cancelRazorpaySubscription(
  subscriptionId: string,
  cancelAtCycleEnd: boolean = true
): Promise<void> {
  const rz = getRazorpay();

  await (rz.subscriptions as any).cancel(subscriptionId, cancelAtCycleEnd);
}

export async function updateRazorpaySubscription(
  subscriptionId: string,
  newPlanId: string
): Promise<void> {
  const rz = getRazorpay();

  await (rz.subscriptions as any).update(subscriptionId, {
    plan_id: newPlanId,
  });
}

export async function fetchRazorpaySubscription(
  subscriptionId: string
): Promise<Record<string, unknown>> {
  const rz = getRazorpay();

  const subscription = await (rz.subscriptions as any).fetch(subscriptionId);
  return subscription as Record<string, unknown>;
}
