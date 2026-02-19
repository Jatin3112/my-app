import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the stripe module before importing our code
// ---------------------------------------------------------------------------

const mockCheckoutSessionsCreate = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();
const mockSubscriptionsUpdate = vi.fn();
const mockCustomersCreate = vi.fn();
const mockWebhooksConstructEvent = vi.fn();

vi.mock("stripe", () => {
  const MockStripe = function (this: any) {
    this.checkout = {
      sessions: { create: mockCheckoutSessionsCreate },
    };
    this.subscriptions = {
      retrieve: mockSubscriptionsRetrieve,
      update: mockSubscriptionsUpdate,
    };
    this.customers = {
      create: mockCustomersCreate,
    };
    this.webhooks = {
      constructEvent: mockWebhooksConstructEvent,
    };
  } as any;
  return { default: MockStripe };
});

// Import after mock setup
import {
  getStripe,
  createCheckoutSession,
  cancelStripeSubscription,
  getStripeSubscription,
  createStripeCustomer,
  verifyStripeWebhook,
} from "@/lib/payments/stripe";

// ---------------------------------------------------------------------------
// getStripe
// ---------------------------------------------------------------------------

describe("getStripe", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc123";
  });

  it("returns a Stripe instance when STRIPE_SECRET_KEY is set", () => {
    const instance = getStripe();
    expect(instance).toBeDefined();
    expect(instance.checkout).toBeDefined();
    expect(instance.subscriptions).toBeDefined();
    expect(instance.customers).toBeDefined();
    expect(instance.webhooks).toBeDefined();
  });

  it("returns the same singleton on subsequent calls", () => {
    const a = getStripe();
    const b = getStripe();
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// createCheckoutSession
// ---------------------------------------------------------------------------

describe("createCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_abc123";
  });

  it("creates a checkout session and returns sessionId + url", async () => {
    mockCheckoutSessionsCreate.mockResolvedValue({
      id: "cs_test_session123",
      url: "https://checkout.stripe.com/pay/cs_test_session123",
    });

    const result = await createCheckoutSession({
      priceId: "price_abc123",
      customerId: "cus_xyz789",
      workspaceId: "ws_1",
      successUrl: "https://example.com/billing/success",
      cancelUrl: "https://example.com/billing/cancel",
    });

    expect(result).toEqual({
      sessionId: "cs_test_session123",
      url: "https://checkout.stripe.com/pay/cs_test_session123",
    });

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith({
      mode: "subscription",
      customer: "cus_xyz789",
      line_items: [{ price: "price_abc123", quantity: 1 }],
      success_url: "https://example.com/billing/success",
      cancel_url: "https://example.com/billing/cancel",
      metadata: { workspace_id: "ws_1" },
    });
  });

  it("creates a checkout session without customerId", async () => {
    mockCheckoutSessionsCreate.mockResolvedValue({
      id: "cs_test_session456",
      url: "https://checkout.stripe.com/pay/cs_test_session456",
    });

    const result = await createCheckoutSession({
      priceId: "price_abc123",
      workspaceId: "ws_2",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    });

    expect(result).toEqual({
      sessionId: "cs_test_session456",
      url: "https://checkout.stripe.com/pay/cs_test_session456",
    });

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith({
      mode: "subscription",
      line_items: [{ price: "price_abc123", quantity: 1 }],
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
      metadata: { workspace_id: "ws_2" },
    });
  });
});

// ---------------------------------------------------------------------------
// cancelStripeSubscription
// ---------------------------------------------------------------------------

describe("cancelStripeSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels at period end by default", async () => {
    mockSubscriptionsUpdate.mockResolvedValue({
      id: "sub_abc123",
      cancel_at_period_end: true,
    });

    await cancelStripeSubscription("sub_abc123");

    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith("sub_abc123", {
      cancel_at_period_end: true,
    });
  });

  it("cancels immediately when cancelAtPeriodEnd is false", async () => {
    mockSubscriptionsUpdate.mockResolvedValue({
      id: "sub_abc123",
      cancel_at_period_end: false,
    });

    await cancelStripeSubscription("sub_abc123", false);

    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith("sub_abc123", {
      cancel_at_period_end: false,
    });
  });
});

// ---------------------------------------------------------------------------
// getStripeSubscription
// ---------------------------------------------------------------------------

describe("getStripeSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retrieves and returns subscription details", async () => {
    const mockData = {
      id: "sub_abc123",
      status: "active",
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      items: { data: [{ price: { id: "price_abc123" } }] },
    };
    mockSubscriptionsRetrieve.mockResolvedValue(mockData);

    const result = await getStripeSubscription("sub_abc123");

    expect(result).toEqual(mockData);
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith("sub_abc123");
  });
});

// ---------------------------------------------------------------------------
// createStripeCustomer
// ---------------------------------------------------------------------------

describe("createStripeCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a customer with email and returns customer ID", async () => {
    mockCustomersCreate.mockResolvedValue({ id: "cus_new123" });

    const customerId = await createStripeCustomer("user@example.com");

    expect(customerId).toBe("cus_new123");
    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: "user@example.com",
    });
  });

  it("creates a customer with email and name", async () => {
    mockCustomersCreate.mockResolvedValue({ id: "cus_new456" });

    const customerId = await createStripeCustomer(
      "user@example.com",
      "John Doe"
    );

    expect(customerId).toBe("cus_new456");
    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: "user@example.com",
      name: "John Doe",
    });
  });
});

// ---------------------------------------------------------------------------
// verifyStripeWebhook
// ---------------------------------------------------------------------------

describe("verifyStripeWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the event on valid signature", () => {
    const mockEvent = {
      id: "evt_test123",
      type: "checkout.session.completed",
      data: { object: {} },
    };
    mockWebhooksConstructEvent.mockReturnValue(mockEvent);

    const body = '{"id":"evt_test123"}';
    const signature = "t=1234,v1=abc123";
    const secret = "whsec_test_secret";

    const event = verifyStripeWebhook(body, signature, secret);

    expect(event).toEqual(mockEvent);
    expect(mockWebhooksConstructEvent).toHaveBeenCalledWith(
      body,
      signature,
      secret
    );
  });

  it("throws on invalid signature", () => {
    mockWebhooksConstructEvent.mockImplementation(() => {
      throw new Error("Webhook signature verification failed.");
    });

    const body = '{"id":"evt_test123"}';
    const signature = "t=1234,v1=invalid";
    const secret = "whsec_test_secret";

    expect(() => verifyStripeWebhook(body, signature, secret)).toThrow(
      "Webhook signature verification failed."
    );
  });
});
