import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the route
// ---------------------------------------------------------------------------

const mockGetServerSession = vi.fn();
const mockPlansFindFirst = vi.fn();
const mockWorkspacesFindFirst = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn(() => ({ where: vi.fn() }));
const mockCreateCheckoutSession = vi.fn();
const mockCreateStripeCustomer = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}));

vi.mock("@/lib/auth/auth-options", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      plans: {
        findFirst: (...args: any[]) => mockPlansFindFirst(...args),
      },
      workspaces: {
        findFirst: (...args: any[]) => mockWorkspacesFindFirst(...args),
      },
    },
    update: (...args: any[]) => mockUpdate(...args),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  plans: { slug: "slug" },
  workspaces: { id: "id", stripe_customer_id: "stripe_customer_id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
}));

vi.mock("@/lib/payments/stripe", () => ({
  createCheckoutSession: (...args: any[]) =>
    mockCreateCheckoutSession(...args),
  createStripeCustomer: (...args: any[]) =>
    mockCreateStripeCustomer(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>) {
  return new Request(
    "http://localhost/api/payments/stripe/create-checkout",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

async function importRoute() {
  const mod = await import(
    "@/app/api/payments/stripe/create-checkout/route"
  );
  return mod;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/payments/stripe/create-checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  });

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { POST } = await importRoute();
    const res = await POST(
      makeRequest({ planSlug: "solo", workspaceId: "ws-1" }) as any
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when planSlug is missing", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com", name: "Test" },
    });

    const { POST } = await importRoute();
    const res = await POST(makeRequest({ workspaceId: "ws-1" }) as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("returns 400 when workspaceId is missing", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com", name: "Test" },
    });

    const { POST } = await importRoute();
    const res = await POST(makeRequest({ planSlug: "solo" }) as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("returns 400 when plan not found", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com", name: "Test" },
    });
    mockPlansFindFirst.mockResolvedValue(null);

    const { POST } = await importRoute();
    const res = await POST(
      makeRequest({ planSlug: "nonexistent", workspaceId: "ws-1" }) as any
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Plan not found");
  });

  it("returns 400 when plan has no stripe_price_id", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com", name: "Test" },
    });
    mockPlansFindFirst.mockResolvedValue({
      id: "plan-1",
      slug: "solo",
      stripe_price_id: null,
    });

    const { POST } = await importRoute();
    const res = await POST(
      makeRequest({ planSlug: "solo", workspaceId: "ws-1" }) as any
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Plan not found or Stripe price not configured");
  });

  it("creates Stripe customer if workspace has no stripe_customer_id", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com", name: "Test User" },
    });
    mockPlansFindFirst.mockResolvedValue({
      id: "plan-1",
      slug: "solo",
      stripe_price_id: "price_abc123",
    });
    mockWorkspacesFindFirst.mockResolvedValue({
      id: "ws-1",
      name: "My Workspace",
      stripe_customer_id: null,
    });
    mockCreateStripeCustomer.mockResolvedValue("cus_new_123");

    const mockWhere = vi.fn();
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });

    mockCreateCheckoutSession.mockResolvedValue({
      sessionId: "cs_test_abc",
      url: "https://checkout.stripe.com/session/cs_test_abc",
    });

    const { POST } = await importRoute();
    const res = await POST(
      makeRequest({ planSlug: "solo", workspaceId: "ws-1" }) as any
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockCreateStripeCustomer).toHaveBeenCalledWith(
      "test@test.com",
      "Test User"
    );
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith({ stripe_customer_id: "cus_new_123" });
    expect(data.sessionId).toBe("cs_test_abc");
    expect(data.url).toBe("https://checkout.stripe.com/session/cs_test_abc");
  });

  it("returns 200 with sessionId and url on success (existing customer)", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com", name: "Test User" },
    });
    mockPlansFindFirst.mockResolvedValue({
      id: "plan-1",
      slug: "team",
      stripe_price_id: "price_team_456",
    });
    mockWorkspacesFindFirst.mockResolvedValue({
      id: "ws-2",
      name: "Team Workspace",
      stripe_customer_id: "cus_existing_789",
    });
    mockCreateCheckoutSession.mockResolvedValue({
      sessionId: "cs_test_def",
      url: "https://checkout.stripe.com/session/cs_test_def",
    });

    const { POST } = await importRoute();
    const res = await POST(
      makeRequest({ planSlug: "team", workspaceId: "ws-2" }) as any
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sessionId).toBe("cs_test_def");
    expect(data.url).toBe("https://checkout.stripe.com/session/cs_test_def");
    // Should NOT create a new customer
    expect(mockCreateStripeCustomer).not.toHaveBeenCalled();
    // Should NOT update workspace
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
      priceId: "price_team_456",
      customerId: "cus_existing_789",
      workspaceId: "ws-2",
      successUrl: "http://localhost:3000/billing?success=true",
      cancelUrl: "http://localhost:3000/billing?canceled=true",
    });
  });

  it("returns 500 when Stripe API throws", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com", name: "Test" },
    });
    mockPlansFindFirst.mockResolvedValue({
      id: "plan-1",
      slug: "solo",
      stripe_price_id: "price_abc123",
    });
    mockWorkspacesFindFirst.mockResolvedValue({
      id: "ws-1",
      name: "My Workspace",
      stripe_customer_id: "cus_existing",
    });
    mockCreateCheckoutSession.mockRejectedValue(
      new Error("Stripe API error")
    );

    const { POST } = await importRoute();
    const res = await POST(
      makeRequest({ planSlug: "solo", workspaceId: "ws-1" }) as any
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
