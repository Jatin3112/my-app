import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockSubWithPlan,
  createExpiredTrialSub,
  createActiveTrialSub,
  createActivePaidSub,
  createMockPlan,
  createSoloPlan,
  resetIdCounter,
} from "../../utils/test-helpers";

// Mock db and cache before importing the module under test
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      subscriptions: { findFirst: vi.fn() },
      plans: { findFirst: vi.fn(), findMany: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  },
}));

vi.mock("@/lib/cache", () => ({
  cached: vi.fn((_key: string, _ttl: number, fetcher: () => Promise<unknown>) => fetcher()),
  cacheDel: vi.fn(),
}));

// Now import the functions under test (after mocks are set up)
import {
  isTrialExpired,
  getTrialDaysRemaining,
  getPlanLimits,
  isSubscriptionActive,
  getSubscription,
  getWorkspaceSubscriptionStatus,
} from "@/lib/api/subscriptions";
import { db } from "@/lib/db";

beforeEach(() => {
  vi.clearAllMocks();
  resetIdCounter();
});

// ─── isTrialExpired ───

describe("isTrialExpired", () => {
  it("returns false for non-trialing subscription", async () => {
    const sub = createMockSubWithPlan({ status: "active" });
    expect(await isTrialExpired(sub)).toBe(false);
  });

  it("returns false when trial_end is null", async () => {
    const sub = createMockSubWithPlan({ status: "trialing", trial_end: null });
    expect(await isTrialExpired(sub)).toBe(false);
  });

  it("returns true when trial_end is in the past", async () => {
    const sub = createExpiredTrialSub();
    expect(await isTrialExpired(sub)).toBe(true);
  });

  it("returns false when trial_end is in the future", async () => {
    const sub = createActiveTrialSub(10);
    expect(await isTrialExpired(sub)).toBe(false);
  });
});

// ─── getTrialDaysRemaining ───

describe("getTrialDaysRemaining", () => {
  it("returns 0 for non-trialing subscription", async () => {
    const sub = createActivePaidSub();
    expect(await getTrialDaysRemaining(sub)).toBe(0);
  });

  it("returns 0 when trial_end is null", async () => {
    const sub = createMockSubWithPlan({ status: "trialing", trial_end: null });
    expect(await getTrialDaysRemaining(sub)).toBe(0);
  });

  it("returns 0 for expired trial", async () => {
    const sub = createExpiredTrialSub();
    expect(await getTrialDaysRemaining(sub)).toBe(0);
  });

  it("returns correct days remaining for active trial", async () => {
    const sub = createActiveTrialSub(7);
    const days = await getTrialDaysRemaining(sub);
    // Should be 7 (ceil of ~7 days)
    expect(days).toBeGreaterThanOrEqual(6);
    expect(days).toBeLessThanOrEqual(8);
  });

  it("returns 1 for trial ending tomorrow", async () => {
    const sub = createActiveTrialSub(1);
    const days = await getTrialDaysRemaining(sub);
    expect(days).toBeGreaterThanOrEqual(1);
    expect(days).toBeLessThanOrEqual(2);
  });
});

// ─── getPlanLimits ───

describe("getPlanLimits", () => {
  it("returns correct limits for a plan", async () => {
    const plan = createSoloPlan();
    const limits = await getPlanLimits(plan);
    expect(limits).toEqual({
      maxUsers: 1,
      maxProjects: 3,
      maxWorkspaces: 1,
      features: [],
    });
  });

  it("returns -1 for unlimited fields", async () => {
    const plan = createMockPlan({ max_projects: -1, max_workspaces: -1 });
    const limits = await getPlanLimits(plan);
    expect(limits.maxProjects).toBe(-1);
    expect(limits.maxWorkspaces).toBe(-1);
  });

  it("returns features array", async () => {
    const plan = createMockPlan({ features: ["voice-capture", "ai-parsing"] });
    const limits = await getPlanLimits(plan);
    expect(limits.features).toEqual(["voice-capture", "ai-parsing"]);
  });

  it("returns empty features when null", async () => {
    const plan = createMockPlan({ features: null as unknown as string[] });
    const limits = await getPlanLimits(plan);
    expect(limits.features).toEqual([]);
  });
});

// ─── isSubscriptionActive ───

describe("isSubscriptionActive", () => {
  it("returns true for active status", async () => {
    const sub = createActivePaidSub();
    expect(await isSubscriptionActive(sub)).toBe(true);
  });

  it("returns true for trialing with future trial_end", async () => {
    const sub = createActiveTrialSub(10);
    expect(await isSubscriptionActive(sub)).toBe(true);
  });

  it("returns false for expired trial", async () => {
    const sub = createExpiredTrialSub();
    expect(await isSubscriptionActive(sub)).toBe(false);
  });

  it("returns false for cancelled status", async () => {
    const sub = createMockSubWithPlan({ status: "cancelled" });
    expect(await isSubscriptionActive(sub)).toBe(false);
  });

  it("returns false for expired status", async () => {
    const sub = createMockSubWithPlan({ status: "expired" });
    expect(await isSubscriptionActive(sub)).toBe(false);
  });
});

// ─── getSubscription ───

describe("getSubscription", () => {
  it("returns subscription with plan when found", async () => {
    const mockSub = createMockSubWithPlan();
    vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(mockSub);

    const result = await getSubscription("workspace-123");
    expect(result).toEqual(mockSub);
    expect(db.query.subscriptions.findFirst).toHaveBeenCalledOnce();
  });

  it("returns null when no subscription found", async () => {
    vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(undefined);

    const result = await getSubscription("workspace-123");
    expect(result).toBeNull();
  });
});

// ─── getWorkspaceSubscriptionStatus ───

describe("getWorkspaceSubscriptionStatus", () => {
  it("returns none status when no subscription exists", async () => {
    vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(undefined);

    const result = await getWorkspaceSubscriptionStatus("ws-1");
    expect(result).toEqual({
      isActive: false,
      status: "none",
      plan: null,
      trialDaysRemaining: 0,
      isTrialing: false,
    });
  });

  it("returns active trial status", async () => {
    const sub = createActiveTrialSub(10);
    vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(sub);

    const result = await getWorkspaceSubscriptionStatus("ws-1");
    expect(result.isActive).toBe(true);
    expect(result.status).toBe("trialing");
    expect(result.isTrialing).toBe(true);
    expect(result.trialDaysRemaining).toBeGreaterThan(0);
    expect(result.plan).toBeTruthy();
  });

  it("marks expired trial and updates DB", async () => {
    const sub = createExpiredTrialSub();
    vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(sub);

    const mockSet = vi.fn().mockReturnValue({ where: vi.fn() });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

    const result = await getWorkspaceSubscriptionStatus("ws-1");
    expect(result.isActive).toBe(false);
    expect(result.status).toBe("expired");
    expect(result.isTrialing).toBe(false);
    expect(result.trialDaysRemaining).toBe(0);
    expect(db.update).toHaveBeenCalled();
  });

  it("returns active paid subscription status", async () => {
    const sub = createActivePaidSub();
    vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(sub);

    const result = await getWorkspaceSubscriptionStatus("ws-1");
    expect(result.isActive).toBe(true);
    expect(result.status).toBe("active");
    expect(result.isTrialing).toBe(false);
    expect(result.trialDaysRemaining).toBe(0);
  });
});
