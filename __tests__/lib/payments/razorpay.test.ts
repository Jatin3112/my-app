import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Mock the razorpay module before importing our code
// ---------------------------------------------------------------------------

const mockPlansCreate = vi.fn();
const mockSubscriptionsCreate = vi.fn();
const mockSubscriptionsCancel = vi.fn();
const mockSubscriptionsUpdate = vi.fn();
const mockSubscriptionsFetch = vi.fn();

vi.mock("razorpay", () => {
  const MockRazorpay = function (this: any) {
    this.plans = { create: mockPlansCreate };
    this.subscriptions = {
      create: mockSubscriptionsCreate,
      cancel: mockSubscriptionsCancel,
      update: mockSubscriptionsUpdate,
      fetch: mockSubscriptionsFetch,
    };
  } as any;
  return { default: MockRazorpay };
});

// Import after mock setup
import {
  getRazorpay,
  verifyWebhookSignature,
  createRazorpayPlan,
  createRazorpaySubscription,
  cancelRazorpaySubscription,
  updateRazorpaySubscription,
  fetchRazorpaySubscription,
} from "@/lib/payments/razorpay";

// ---------------------------------------------------------------------------
// verifyWebhookSignature
// ---------------------------------------------------------------------------

describe("verifyWebhookSignature", () => {
  const secret = "webhook_secret_123";
  const body = '{"event":"subscription.activated","payload":{}}';

  function createValidSignature(payload: string, key: string): string {
    return crypto.createHmac("sha256", key).update(payload).digest("hex");
  }

  it("returns true for a valid HMAC-SHA256 signature", () => {
    const signature = createValidSignature(body, secret);
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("returns false for an invalid signature (wrong content)", () => {
    const signature = createValidSignature("different body", secret);
    expect(verifyWebhookSignature(body, signature, secret)).toBe(false);
  });

  it("returns false for a signature with wrong secret", () => {
    const signature = createValidSignature(body, "wrong_secret");
    expect(verifyWebhookSignature(body, signature, secret)).toBe(false);
  });

  it("returns false for a mismatched length signature", () => {
    // A shorter hex string than the expected 64-char SHA-256 hex digest
    const shortSignature = "abcdef1234567890";
    expect(verifyWebhookSignature(body, shortSignature, secret)).toBe(false);
  });

  it("returns false for a completely malformed signature", () => {
    expect(verifyWebhookSignature(body, "not-hex-at-all!!!", secret)).toBe(
      false
    );
  });

  it("returns false for an empty signature", () => {
    expect(verifyWebhookSignature(body, "", secret)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getRazorpay
// ---------------------------------------------------------------------------

describe("getRazorpay", () => {
  beforeEach(() => {
    // Reset the singleton between tests by re-importing would be complex,
    // so we just ensure env vars are set for the remaining tests.
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
  });

  it("returns a Razorpay instance when env vars are set", () => {
    const instance = getRazorpay();
    expect(instance).toBeDefined();
    expect(instance.plans).toBeDefined();
    expect(instance.subscriptions).toBeDefined();
  });

  it("returns the same singleton on subsequent calls", () => {
    const a = getRazorpay();
    const b = getRazorpay();
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// createRazorpayPlan
// ---------------------------------------------------------------------------

describe("createRazorpayPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
  });

  it("creates a plan and returns the plan ID", async () => {
    mockPlansCreate.mockResolvedValue({ id: "plan_abc123" });

    const planId = await createRazorpayPlan({
      name: "Solo Monthly",
      amount: 49900,
      currency: "INR",
      period: "monthly",
      interval: 1,
    });

    expect(planId).toBe("plan_abc123");
    expect(mockPlansCreate).toHaveBeenCalledWith({
      period: "monthly",
      interval: 1,
      item: {
        name: "Solo Monthly",
        amount: 49900,
        currency: "INR",
      },
    });
  });
});

// ---------------------------------------------------------------------------
// createRazorpaySubscription
// ---------------------------------------------------------------------------

describe("createRazorpaySubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a subscription and returns id + short_url", async () => {
    mockSubscriptionsCreate.mockResolvedValue({
      id: "sub_xyz789",
      short_url: "https://rzp.io/i/abc",
    });

    const result = await createRazorpaySubscription({
      planId: "plan_abc123",
      totalCount: 12,
      customerNotify: 1,
      notes: { workspace_id: "ws_1" },
    });

    expect(result).toEqual({
      id: "sub_xyz789",
      short_url: "https://rzp.io/i/abc",
    });
    expect(mockSubscriptionsCreate).toHaveBeenCalledWith({
      plan_id: "plan_abc123",
      total_count: 12,
      customer_notify: 1,
      notes: { workspace_id: "ws_1" },
    });
  });

  it("omits notes when not provided", async () => {
    mockSubscriptionsCreate.mockResolvedValue({
      id: "sub_xyz789",
      short_url: "https://rzp.io/i/abc",
    });

    await createRazorpaySubscription({
      planId: "plan_abc123",
      totalCount: 6,
      customerNotify: 0,
    });

    expect(mockSubscriptionsCreate).toHaveBeenCalledWith({
      plan_id: "plan_abc123",
      total_count: 6,
      customer_notify: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// cancelRazorpaySubscription
// ---------------------------------------------------------------------------

describe("cancelRazorpaySubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels at cycle end by default", async () => {
    mockSubscriptionsCancel.mockResolvedValue({});

    await cancelRazorpaySubscription("sub_xyz789");

    expect(mockSubscriptionsCancel).toHaveBeenCalledWith("sub_xyz789", true);
  });

  it("cancels immediately when cancelAtCycleEnd is false", async () => {
    mockSubscriptionsCancel.mockResolvedValue({});

    await cancelRazorpaySubscription("sub_xyz789", false);

    expect(mockSubscriptionsCancel).toHaveBeenCalledWith("sub_xyz789", false);
  });
});

// ---------------------------------------------------------------------------
// updateRazorpaySubscription
// ---------------------------------------------------------------------------

describe("updateRazorpaySubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the subscription with a new plan ID", async () => {
    mockSubscriptionsUpdate.mockResolvedValue({});

    await updateRazorpaySubscription("sub_xyz789", "plan_new456");

    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith("sub_xyz789", {
      plan_id: "plan_new456",
    });
  });
});

// ---------------------------------------------------------------------------
// fetchRazorpaySubscription
// ---------------------------------------------------------------------------

describe("fetchRazorpaySubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and returns subscription details", async () => {
    const mockData = {
      id: "sub_xyz789",
      plan_id: "plan_abc123",
      status: "active",
      current_start: 1700000000,
      current_end: 1702592000,
    };
    mockSubscriptionsFetch.mockResolvedValue(mockData);

    const result = await fetchRazorpaySubscription("sub_xyz789");

    expect(result).toEqual(mockData);
    expect(mockSubscriptionsFetch).toHaveBeenCalledWith("sub_xyz789");
  });
});
