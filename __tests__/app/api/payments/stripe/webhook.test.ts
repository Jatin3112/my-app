import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the route
// ---------------------------------------------------------------------------

const mockVerifyStripeWebhook = vi.fn();
const mockWhere = vi.fn().mockResolvedValue(undefined);
const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
const mockValues = vi.fn().mockResolvedValue(undefined);
const mockFindFirst = vi.fn();

vi.mock("@/lib/payments/stripe", () => ({
  verifyStripeWebhook: (...args: any[]) =>
    mockVerifyStripeWebhook(...args),
}));

vi.mock("@/lib/db", () => ({
  db: {
    update: vi.fn(() => ({ set: mockSet })),
    insert: vi.fn(() => ({ values: mockValues })),
    query: {
      subscriptions: {
        findFirst: (...args: any[]) => mockFindFirst(...args),
      },
    },
  },
}));

vi.mock("@/lib/db/schema", () => ({
  subscriptions: {
    provider_subscription_id: "provider_subscription_id",
    workspace_id: "workspace_id",
  },
  paymentHistory: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStripeEvent(type: string, dataObject: Record<string, unknown>) {
  return { type, data: { object: dataObject } };
}

function makeWebhookRequest(
  eventType: string,
  dataObject: Record<string, unknown>,
  headers: Record<string, string> = {}
) {
  const body = JSON.stringify(makeStripeEvent(eventType, dataObject));
  return new Request("http://localhost/api/payments/stripe/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": "valid_stripe_sig",
      ...headers,
    },
    body,
  });
}

async function importRoute() {
  const mod = await import(
    "@/app/api/payments/stripe/webhook/route"
  );
  return mod;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/payments/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";
  });

  // -------------------------------------------------------------------------
  // Validation / Error cases
  // -------------------------------------------------------------------------

  it("returns 400 when stripe-signature header is missing", async () => {
    const req = new Request("http://localhost/api/payments/stripe/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const { POST } = await importRoute();
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing signature header");
  });

  it("returns 500 when STRIPE_WEBHOOK_SECRET env var is not set", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const req = makeWebhookRequest("checkout.session.completed", {});

    const { POST } = await importRoute();
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Webhook secret not configured");
  });

  it("returns 400 when signature verification fails", async () => {
    mockVerifyStripeWebhook.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const req = makeWebhookRequest("checkout.session.completed", {});

    const { POST } = await importRoute();
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid signature");
    expect(mockVerifyStripeWebhook).toHaveBeenCalledWith(
      expect.any(String),
      "valid_stripe_sig",
      "whsec_test_123"
    );
  });

  // -------------------------------------------------------------------------
  // checkout.session.completed
  // -------------------------------------------------------------------------

  it("handles checkout.session.completed — updates subscription to active with stripe provider", async () => {
    const stripeEvent = makeStripeEvent("checkout.session.completed", {
      metadata: { workspace_id: "ws_123" },
      subscription: "sub_stripe_456",
    });
    mockVerifyStripeWebhook.mockReturnValue(stripeEvent);

    const req = makeWebhookRequest("checkout.session.completed", {
      metadata: { workspace_id: "ws_123" },
      subscription: "sub_stripe_456",
    });

    const { POST } = await importRoute();
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");

    const { db } = await import("@/lib/db");
    expect(db.update).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
        payment_provider: "stripe",
        provider_subscription_id: "sub_stripe_456",
      })
    );
    expect(mockWhere).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // invoice.paid
  // -------------------------------------------------------------------------

  it("handles invoice.paid — updates period dates and records payment", async () => {
    const stripeEvent = makeStripeEvent("invoice.paid", {
      subscription: "sub_stripe_456",
      period_start: 1700000000,
      period_end: 1702592000,
      amount_paid: 1900,
      currency: "usd",
      id: "in_payment_789",
    });
    mockVerifyStripeWebhook.mockReturnValue(stripeEvent);

    mockFindFirst.mockResolvedValue({
      id: "local_sub_1",
      workspace_id: "ws_123",
    });

    const req = makeWebhookRequest("invoice.paid", {
      subscription: "sub_stripe_456",
      period_start: 1700000000,
      period_end: 1702592000,
      amount_paid: 1900,
      currency: "usd",
      id: "in_payment_789",
    });

    const { POST } = await importRoute();
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");

    const { db } = await import("@/lib/db");

    // Verify subscription period update
    expect(db.update).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        current_period_start: new Date(1700000000 * 1000),
        current_period_end: new Date(1702592000 * 1000),
      })
    );

    // Verify payment history insert
    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "ws_123",
        subscription_id: "local_sub_1",
        amount: 1900,
        currency: "USD",
        provider: "stripe",
        provider_payment_id: "in_payment_789",
        status: "captured",
        description: "Subscription payment",
      })
    );
  });

  // -------------------------------------------------------------------------
  // customer.subscription.deleted
  // -------------------------------------------------------------------------

  it("handles customer.subscription.deleted — sets status to cancelled", async () => {
    const stripeEvent = makeStripeEvent("customer.subscription.deleted", {
      id: "sub_stripe_456",
    });
    mockVerifyStripeWebhook.mockReturnValue(stripeEvent);

    const req = makeWebhookRequest("customer.subscription.deleted", {
      id: "sub_stripe_456",
    });

    const { POST } = await importRoute();
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");

    const { db } = await import("@/lib/db");
    expect(db.update).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "cancelled",
      })
    );
    expect(mockWhere).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Unknown event
  // -------------------------------------------------------------------------

  it("returns 200 for unknown event types (no-op)", async () => {
    const stripeEvent = makeStripeEvent("some.unknown.event", {
      id: "test_123",
    });
    mockVerifyStripeWebhook.mockReturnValue(stripeEvent);

    const req = makeWebhookRequest("some.unknown.event", {
      id: "test_123",
    });

    const { POST } = await importRoute();
    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");

    // No DB operations should have been called
    const { db } = await import("@/lib/db");
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
