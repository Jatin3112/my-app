import Stripe from "stripe";

// ---------------------------------------------------------------------------
// Lazy singleton Stripe client
// ---------------------------------------------------------------------------

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error(
        "Missing Stripe credentials. Set STRIPE_SECRET_KEY environment variable."
      );
    }

    stripeInstance = new Stripe(secretKey);
  }

  return stripeInstance;
}

// ---------------------------------------------------------------------------
// Customer helpers
// ---------------------------------------------------------------------------

export async function createStripeCustomer(
  email: string,
  name?: string
): Promise<string> {
  const stripe = getStripe();

  const params: Stripe.CustomerCreateParams = { email };
  if (name) {
    params.name = name;
  }

  const customer = await stripe.customers.create(params);

  return customer.id;
}

// ---------------------------------------------------------------------------
// Checkout helpers
// ---------------------------------------------------------------------------

interface CreateCheckoutSessionOptions {
  priceId: string;
  customerId?: string;
  workspaceId: string;
  successUrl: string;
  cancelUrl: string;
}

interface CreateCheckoutSessionResult {
  sessionId: string;
  url: string | null;
}

export async function createCheckoutSession(
  opts: CreateCheckoutSessionOptions
): Promise<CreateCheckoutSessionResult> {
  const stripe = getStripe();

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: opts.priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: { workspace_id: opts.workspaceId },
  };

  if (opts.customerId) {
    params.customer = opts.customerId;
  }

  const session = await stripe.checkout.sessions.create(params);

  return {
    sessionId: session.id,
    url: session.url,
  };
}

// ---------------------------------------------------------------------------
// Subscription helpers
// ---------------------------------------------------------------------------

export async function getStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

export async function cancelStripeSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<void> {
  const stripe = getStripe();

  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

export function verifyStripeWebhook(
  body: string,
  signature: string,
  secret: string
): Stripe.Event {
  const stripe = getStripe();

  return stripe.webhooks.constructEvent(body, signature, secret);
}
