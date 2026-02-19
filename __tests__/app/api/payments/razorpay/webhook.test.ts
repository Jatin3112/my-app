import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the route
// ---------------------------------------------------------------------------

const mockVerifyWebhookSignature = vi.fn();
const mockWhere = vi.fn().mockResolvedValue(undefined);
const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
const mockValues = vi.fn().mockResolvedValue(undefined);
const mockFindFirst = vi.fn();

vi.mock("@/lib/payments/razorpay", () => ({
  verifyWebhookSignature: (...args: any[]) =>
    mockVerifyWebhookSignature(...args),
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

function makeWebhookRequest(
  eventType: string,
  payload: Record<string, unknown>
) {
  const body = JSON.stringify({ event: eventType, payload });
  return new Request("http://localhost/api/payments/razorpay/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": "valid_signature_hex",
    },
    body,
  });
}

async function importRoute() {
  const mod = await import(
    "@/app/api/payments/razorpay/webhook/route"
  );
  return mod;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/payments/razorpay/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook_secret_123";
  });

  it("returns 400 for invalid signature", async () => {
    mockVerifyWebhookSignature.mockReturnValue(false);

    const { POST } = await importRoute();
    const res = await POST(
      makeWebhookRequest("subscription.activated", {
        subscription: {
          entity: { id: "sub_123", current_start: 1700000000, current_end: 1702592000 },
        },
      }) as any
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid signature");
    expect(mockVerifyWebhookSignature).toHaveBeenCalledWith(
      expect.any(String),
      "valid_signature_hex",
      "webhook_secret_123"
    );
  });

  it("returns 200 and updates subscription status to 'active' for subscription.activated", async () => {
    mockVerifyWebhookSignature.mockReturnValue(true);

    const { POST } = await importRoute();
    const res = await POST(
      makeWebhookRequest("subscription.activated", {
        subscription: {
          entity: {
            id: "sub_activated_123",
            current_start: 1700000000,
            current_end: 1702592000,
          },
        },
      }) as any
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");

    // Verify db.update was called
    const { db } = await import("@/lib/db");
    expect(db.update).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
        current_period_start: new Date(1700000000 * 1000),
        current_period_end: new Date(1702592000 * 1000),
      })
    );
    expect(mockWhere).toHaveBeenCalled();
  });

  it("returns 200 for subscription.cancelled — sets status to 'cancelled'", async () => {
    mockVerifyWebhookSignature.mockReturnValue(true);

    const { POST } = await importRoute();
    const res = await POST(
      makeWebhookRequest("subscription.cancelled", {
        subscription: {
          entity: {
            id: "sub_cancel_456",
            current_start: 1700000000,
            current_end: 1702592000,
          },
        },
      }) as any
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");

    const { db } = await import("@/lib/db");
    expect(db.update).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "cancelled",
        cancel_at_period_end: true,
      })
    );
    expect(mockWhere).toHaveBeenCalled();
  });

  it("returns 200 for unknown event (no-op, just returns ok)", async () => {
    mockVerifyWebhookSignature.mockReturnValue(true);

    const { POST } = await importRoute();
    const res = await POST(
      makeWebhookRequest("some.unknown.event", {
        something: { entity: { id: "test" } },
      }) as any
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");

    // No DB operations should have been called
    const { db } = await import("@/lib/db");
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
