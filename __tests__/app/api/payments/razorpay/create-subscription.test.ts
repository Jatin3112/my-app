import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the route
// ---------------------------------------------------------------------------

const mockGetServerSession = vi.fn();
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockSet = vi.fn(() => ({ where: vi.fn() }));
const mockValues = vi.fn();
const mockCreateRazorpaySubscription = vi.fn();
const mockGetSubscription = vi.fn();

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
        findFirst: (...args: any[]) => mockFindFirst(...args),
      },
    },
    update: (...args: any[]) => mockUpdate(...args),
    insert: (...args: any[]) => mockInsert(...args),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  plans: { slug: "slug" },
  subscriptions: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
}));

vi.mock("@/lib/payments/razorpay", () => ({
  createRazorpaySubscription: (...args: any[]) =>
    mockCreateRazorpaySubscription(...args),
}));

vi.mock("@/lib/api/subscriptions", () => ({
  getSubscription: (...args: any[]) => mockGetSubscription(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: Record<string, unknown>) {
  return new Request(
    "http://localhost/api/payments/razorpay/create-subscription",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

async function importRoute() {
  const mod = await import(
    "@/app/api/payments/razorpay/create-subscription/route"
  );
  return mod;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/payments/razorpay/create-subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const { POST } = await importRoute();
    const res = await POST(makeRequest({ planSlug: "solo", workspaceId: "ws-1" }) as any);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when planSlug is missing", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
    });

    const { POST } = await importRoute();
    const res = await POST(makeRequest({ workspaceId: "ws-1" }) as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("returns 400 when workspaceId is missing", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
    });

    const { POST } = await importRoute();
    const res = await POST(makeRequest({ planSlug: "solo" }) as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("returns 400 when plan not found", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
    });
    mockFindFirst.mockResolvedValue(null);

    const { POST } = await importRoute();
    const res = await POST(
      makeRequest({ planSlug: "nonexistent", workspaceId: "ws-1" }) as any
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Plan not found");
  });

  it("returns 400 when plan has no razorpay_plan_id", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
    });
    mockFindFirst.mockResolvedValue({
      id: "plan-1",
      slug: "solo",
      razorpay_plan_id: null,
    });

    const { POST } = await importRoute();
    const res = await POST(
      makeRequest({ planSlug: "solo", workspaceId: "ws-1" }) as any
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Plan not found or Razorpay plan not configured");
  });

  it("updates existing subscription and returns subscriptionId + shortUrl", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
    });
    mockFindFirst.mockResolvedValue({
      id: "plan-1",
      slug: "solo",
      razorpay_plan_id: "plan_rz_abc",
    });
    mockCreateRazorpaySubscription.mockResolvedValue({
      id: "sub_rz_xyz",
      short_url: "https://rzp.io/i/test",
    });
    mockGetSubscription.mockResolvedValue({
      id: "existing-sub-1",
      workspace_id: "ws-1",
      plan_id: "old-plan",
    });

    const mockWhere = vi.fn();
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });

    const { POST } = await importRoute();
    const res = await POST(
      makeRequest({ planSlug: "solo", workspaceId: "ws-1" }) as any
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.subscriptionId).toBe("sub_rz_xyz");
    expect(data.shortUrl).toBe("https://rzp.io/i/test");
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockCreateRazorpaySubscription).toHaveBeenCalledWith({
      planId: "plan_rz_abc",
      totalCount: 12,
      customerNotify: 1,
      notes: {
        workspace_id: "ws-1",
        user_id: "user-1",
        plan_slug: "solo",
      },
    });
  });

  it("inserts new subscription when none exists", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
    });
    mockFindFirst.mockResolvedValue({
      id: "plan-1",
      slug: "team",
      razorpay_plan_id: "plan_rz_team",
    });
    mockCreateRazorpaySubscription.mockResolvedValue({
      id: "sub_rz_new",
      short_url: "https://rzp.io/i/new",
    });
    mockGetSubscription.mockResolvedValue(null);
    mockInsert.mockReturnValue({ values: mockValues });

    const { POST } = await importRoute();
    const res = await POST(
      makeRequest({ planSlug: "team", workspaceId: "ws-2" }) as any
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.subscriptionId).toBe("sub_rz_new");
    expect(data.shortUrl).toBe("https://rzp.io/i/new");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("returns 500 when Razorpay API throws", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
    });
    mockFindFirst.mockResolvedValue({
      id: "plan-1",
      slug: "solo",
      razorpay_plan_id: "plan_rz_abc",
    });
    mockCreateRazorpaySubscription.mockRejectedValue(
      new Error("Razorpay API error")
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
