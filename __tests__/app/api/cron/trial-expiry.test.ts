import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing the route
// ---------------------------------------------------------------------------

const mockFindMany = vi.fn();
const mockSendEmail = vi.fn();
const mockTrialExpiryEmailHtml = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      subscriptions: {
        findMany: (...args: any[]) => mockFindMany(...args),
      },
    },
  },
}));

vi.mock("@/lib/db/schema", () => ({
  subscriptions: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/email/templates/trial-expiry", () => ({
  trialExpiryEmailHtml: (...args: any[]) => mockTrialExpiryEmailHtml(...args),
}));

// ---------------------------------------------------------------------------
// Import route after mocks
// ---------------------------------------------------------------------------

import { GET } from "@/app/api/cron/trial-expiry/route";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  const req = new NextRequest("http://localhost:3000/api/cron/trial-expiry", {
    method: "GET",
    headers,
  });
  return req;
}

function makeSub(daysRemaining: number | null, ownerEmail = "owner@test.com", workspaceName = "Test Workspace") {
  const now = new Date();
  const trialEnd = daysRemaining !== null
    ? new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000)
    : null;

  return {
    id: "sub-1",
    workspace_id: "ws-1",
    plan_id: "plan-1",
    status: "trialing",
    trial_start: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    trial_end: trialEnd,
    current_period_start: null,
    current_period_end: null,
    payment_provider: null,
    provider_subscription_id: null,
    cancel_at_period_end: false,
    created_at: now,
    updated_at: now,
    workspace: {
      id: "ws-1",
      name: workspaceName,
      slug: "test-workspace",
      owner_id: "user-1",
      owner: {
        id: "user-1",
        email: ownerEmail,
        name: "Test Owner",
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  mockTrialExpiryEmailHtml.mockReturnValue("<html>test</html>");
  mockSendEmail.mockResolvedValue(true);
});

describe("GET /api/cron/trial-expiry", () => {
  describe("Authentication", () => {
    it("returns 401 when x-cron-secret header is missing", async () => {
      const req = makeRequest();
      const res = await GET(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it("returns 401 when x-cron-secret header doesn't match CRON_SECRET env var", async () => {
      const req = makeRequest({ "x-cron-secret": "wrong-secret" });
      const res = await GET(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
      expect(mockFindMany).not.toHaveBeenCalled();
    });
  });

  describe("Email sending for warning thresholds", () => {
    it.each([4, 2, 1, 0])("sends email when %d days remaining", async (days) => {
      mockFindMany.mockResolvedValue([makeSub(days)]);

      const req = makeRequest({ "x-cron-secret": "test-secret" });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.emailsSent).toBe(1);

      expect(mockTrialExpiryEmailHtml).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceName: "Test Workspace",
          daysRemaining: days,
        }),
      );

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "owner@test.com",
          html: "<html>test</html>",
        }),
      );
    });
  });

  describe("Skipping logic", () => {
    it("skips subscriptions with more than 4 days remaining", async () => {
      mockFindMany.mockResolvedValue([makeSub(10)]);

      const req = makeRequest({ "x-cron-secret": "test-secret" });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.processed).toBe(1);
      expect(body.emailsSent).toBe(0);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("skips subscriptions with no trial_end date", async () => {
      mockFindMany.mockResolvedValue([makeSub(null)]);

      const req = makeRequest({ "x-cron-secret": "test-secret" });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.processed).toBe(1);
      expect(body.emailsSent).toBe(0);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("Response body", () => {
    it("returns count of processed and emailsSent", async () => {
      mockFindMany.mockResolvedValue([
        makeSub(4, "a@test.com", "WS-A"),
        makeSub(10, "b@test.com", "WS-B"),   // skipped — 10 days
        makeSub(1, "c@test.com", "WS-C"),
        makeSub(null, "d@test.com", "WS-D"),  // skipped — no trial_end
      ]);

      const req = makeRequest({ "x-cron-secret": "test-secret" });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.processed).toBe(4);
      expect(body.emailsSent).toBe(2);
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
    });

    it("returns 0 counts when no trialing subscriptions exist", async () => {
      mockFindMany.mockResolvedValue([]);

      const req = makeRequest({ "x-cron-secret": "test-secret" });
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.processed).toBe(0);
      expect(body.emailsSent).toBe(0);
    });
  });
});
