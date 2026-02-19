import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockSubWithPlan,
  createActivePaidSub,
  createExpiredTrialSub,
  createActiveTrialSub,
  createSoloPlan,
  createTeamPlan,
  resetIdCounter,
} from "../../utils/test-helpers";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      workspaceMembers: { findMany: vi.fn() },
    },
    select: vi.fn(),
  },
}));

vi.mock("@/lib/api/subscriptions", () => ({
  getSubscription: vi.fn(),
  isSubscriptionActive: vi.fn(),
  getPlanLimits: vi.fn(),
}));

import { canAddMember, canAddProject, canCreateWorkspace, requireActiveSubscription } from "@/lib/api/plan-enforcement";
import { getSubscription, isSubscriptionActive, getPlanLimits } from "@/lib/api/subscriptions";
import { db } from "@/lib/db";

beforeEach(() => {
  vi.clearAllMocks();
  resetIdCounter();
});

// ─── Helper to set up the mock chain for select().from().where() ───

function mockDbCount(count: number) {
  const mockWhere = vi.fn().mockResolvedValue([{ count }]);
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);
}

// ─── canAddMember ───

describe("canAddMember", () => {
  it("blocks when no subscription exists", async () => {
    vi.mocked(getSubscription).mockResolvedValue(null);
    const result = await canAddMember("ws-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/No active subscription/);
  });

  it("blocks when subscription is not active", async () => {
    const sub = createExpiredTrialSub();
    vi.mocked(getSubscription).mockResolvedValue(sub);
    vi.mocked(isSubscriptionActive).mockResolvedValue(false);

    const result = await canAddMember("ws-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not active/);
  });

  it("allows when under limit", async () => {
    const sub = createActivePaidSub({ max_users: 5 });
    vi.mocked(getSubscription).mockResolvedValue(sub);
    vi.mocked(isSubscriptionActive).mockResolvedValue(true);
    vi.mocked(getPlanLimits).mockResolvedValue({
      maxUsers: 5, maxProjects: 10, maxWorkspaces: 3, features: [],
    });
    mockDbCount(3);

    const result = await canAddMember("ws-1");
    expect(result.allowed).toBe(true);
    expect(result.currentUsage).toBe(3);
    expect(result.limit).toBe(5);
  });

  it("blocks when at limit", async () => {
    const sub = createActivePaidSub({ max_users: 5 });
    vi.mocked(getSubscription).mockResolvedValue(sub);
    vi.mocked(isSubscriptionActive).mockResolvedValue(true);
    vi.mocked(getPlanLimits).mockResolvedValue({
      maxUsers: 5, maxProjects: 10, maxWorkspaces: 3, features: [],
    });
    mockDbCount(5);

    const result = await canAddMember("ws-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Plan limit reached/);
    expect(result.currentUsage).toBe(5);
  });

  it("allows unlimited (-1) plan", async () => {
    const sub = createActivePaidSub({ max_users: -1 });
    vi.mocked(getSubscription).mockResolvedValue(sub);
    vi.mocked(isSubscriptionActive).mockResolvedValue(true);
    vi.mocked(getPlanLimits).mockResolvedValue({
      maxUsers: -1, maxProjects: -1, maxWorkspaces: -1, features: [],
    });

    const result = await canAddMember("ws-1");
    expect(result.allowed).toBe(true);
  });
});

// ─── canAddProject ───

describe("canAddProject", () => {
  it("blocks when no subscription", async () => {
    vi.mocked(getSubscription).mockResolvedValue(null);
    const result = await canAddProject("ws-1");
    expect(result.allowed).toBe(false);
  });

  it("blocks when inactive subscription", async () => {
    const sub = createExpiredTrialSub();
    vi.mocked(getSubscription).mockResolvedValue(sub);
    vi.mocked(isSubscriptionActive).mockResolvedValue(false);

    const result = await canAddProject("ws-1");
    expect(result.allowed).toBe(false);
  });

  it("allows under limit", async () => {
    const sub = createActivePaidSub();
    vi.mocked(getSubscription).mockResolvedValue(sub);
    vi.mocked(isSubscriptionActive).mockResolvedValue(true);
    vi.mocked(getPlanLimits).mockResolvedValue({
      maxUsers: 1, maxProjects: 3, maxWorkspaces: 1, features: [],
    });
    mockDbCount(2);

    const result = await canAddProject("ws-1");
    expect(result.allowed).toBe(true);
    expect(result.currentUsage).toBe(2);
    expect(result.limit).toBe(3);
  });

  it("blocks at limit", async () => {
    const sub = createActivePaidSub();
    vi.mocked(getSubscription).mockResolvedValue(sub);
    vi.mocked(isSubscriptionActive).mockResolvedValue(true);
    vi.mocked(getPlanLimits).mockResolvedValue({
      maxUsers: 1, maxProjects: 3, maxWorkspaces: 1, features: [],
    });
    mockDbCount(3);

    const result = await canAddProject("ws-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Plan limit reached/);
  });

  it("allows unlimited projects (-1)", async () => {
    const sub = createActivePaidSub();
    vi.mocked(getSubscription).mockResolvedValue(sub);
    vi.mocked(isSubscriptionActive).mockResolvedValue(true);
    vi.mocked(getPlanLimits).mockResolvedValue({
      maxUsers: 15, maxProjects: -1, maxWorkspaces: -1, features: [],
    });

    const result = await canAddProject("ws-1");
    expect(result.allowed).toBe(true);
  });
});

// ─── canCreateWorkspace ───

describe("canCreateWorkspace", () => {
  it("allows when user has no workspaces (first workspace)", async () => {
    vi.mocked(db.query.workspaceMembers.findMany).mockResolvedValue([]);

    const result = await canCreateWorkspace("user-1");
    expect(result.allowed).toBe(true);
  });

  it("blocks when at default limit (1) with no active sub", async () => {
    vi.mocked(db.query.workspaceMembers.findMany).mockResolvedValue([
      { id: "m1", workspace_id: "ws-1", user_id: "user-1", role: "owner", joined_at: new Date() },
    ]);
    vi.mocked(getSubscription).mockResolvedValue(null);

    const result = await canCreateWorkspace("user-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Plan limit reached/);
  });

  it("allows with active sub that has higher workspace limit", async () => {
    vi.mocked(db.query.workspaceMembers.findMany).mockResolvedValue([
      { id: "m1", workspace_id: "ws-1", user_id: "user-1", role: "owner", joined_at: new Date() },
    ]);
    const sub = createActivePaidSub();
    vi.mocked(getSubscription).mockResolvedValue(sub);
    vi.mocked(isSubscriptionActive).mockResolvedValue(true);
    vi.mocked(getPlanLimits).mockResolvedValue({
      maxUsers: 5, maxProjects: 10, maxWorkspaces: 3, features: [],
    });

    const result = await canCreateWorkspace("user-1");
    expect(result.allowed).toBe(true);
  });

  it("allows unlimited workspaces (-1)", async () => {
    vi.mocked(db.query.workspaceMembers.findMany).mockResolvedValue([
      { id: "m1", workspace_id: "ws-1", user_id: "user-1", role: "owner", joined_at: new Date() },
      { id: "m2", workspace_id: "ws-2", user_id: "user-1", role: "member", joined_at: new Date() },
    ]);
    const sub = createActivePaidSub();
    vi.mocked(getSubscription).mockResolvedValue(sub);
    vi.mocked(isSubscriptionActive).mockResolvedValue(true);
    vi.mocked(getPlanLimits).mockResolvedValue({
      maxUsers: 15, maxProjects: -1, maxWorkspaces: -1, features: [],
    });

    const result = await canCreateWorkspace("user-1");
    expect(result.allowed).toBe(true);
  });

  it("blocks when at workspace limit across multiple subs", async () => {
    vi.mocked(db.query.workspaceMembers.findMany).mockResolvedValue([
      { id: "m1", workspace_id: "ws-1", user_id: "user-1", role: "owner", joined_at: new Date() },
      { id: "m2", workspace_id: "ws-2", user_id: "user-1", role: "member", joined_at: new Date() },
      { id: "m3", workspace_id: "ws-3", user_id: "user-1", role: "member", joined_at: new Date() },
    ]);
    const sub = createActivePaidSub();
    vi.mocked(getSubscription).mockResolvedValue(sub);
    vi.mocked(isSubscriptionActive).mockResolvedValue(true);
    vi.mocked(getPlanLimits).mockResolvedValue({
      maxUsers: 5, maxProjects: 10, maxWorkspaces: 3, features: [],
    });

    const result = await canCreateWorkspace("user-1");
    expect(result.allowed).toBe(false);
  });
});

// ─── requireActiveSubscription ───

describe("requireActiveSubscription", () => {
  it("throws when no subscription exists", async () => {
    vi.mocked(getSubscription).mockResolvedValue(null);
    await expect(requireActiveSubscription("ws-1")).rejects.toThrow("No subscription found");
  });

  it("throws when subscription is expired", async () => {
    const sub = createExpiredTrialSub();
    vi.mocked(getSubscription).mockResolvedValue(sub);
    vi.mocked(isSubscriptionActive).mockResolvedValue(false);

    await expect(requireActiveSubscription("ws-1")).rejects.toThrow("expired");
  });

  it("does not throw for active subscription", async () => {
    const sub = createActivePaidSub();
    vi.mocked(getSubscription).mockResolvedValue(sub);
    vi.mocked(isSubscriptionActive).mockResolvedValue(true);

    await expect(requireActiveSubscription("ws-1")).resolves.toBeUndefined();
  });
});
