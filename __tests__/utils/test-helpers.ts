import type { Plan, Subscription } from "@/lib/db/schema";
import type { SubscriptionWithPlan } from "@/lib/api/subscriptions";

// ─── ID Helpers ───

let idCounter = 0;
export function mockUUID(): string {
  idCounter++;
  return `00000000-0000-0000-0000-${String(idCounter).padStart(12, "0")}`;
}

// ─── Plan Factories ───

export function createMockPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: mockUUID(),
    name: "Agency",
    slug: "agency",
    price_inr: 1999,
    price_usd: 35,
    max_users: 15,
    max_projects: -1,
    max_workspaces: -1,
    features: ["voice-capture", "ai-parsing", "export"],
    is_active: true,
    razorpay_plan_id: null,
    stripe_price_id: null,
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-01-01"),
    ...overrides,
  };
}

export function createSoloPlan(overrides: Partial<Plan> = {}): Plan {
  return createMockPlan({
    name: "Solo",
    slug: "solo",
    price_inr: 499,
    price_usd: 9,
    max_users: 1,
    max_projects: 3,
    max_workspaces: 1,
    features: [],
    ...overrides,
  });
}

export function createTeamPlan(overrides: Partial<Plan> = {}): Plan {
  return createMockPlan({
    name: "Team",
    slug: "team",
    price_inr: 999,
    price_usd: 19,
    max_users: 5,
    max_projects: 10,
    max_workspaces: 3,
    features: ["voice-capture"],
    ...overrides,
  });
}

// ─── Subscription Factories ───

export function createMockSubscription(overrides: Partial<Subscription> = {}): Subscription {
  const now = new Date();
  return {
    id: mockUUID(),
    workspace_id: mockUUID(),
    plan_id: mockUUID(),
    status: "trialing",
    trial_start: now,
    trial_end: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    current_period_start: null,
    current_period_end: null,
    payment_provider: null,
    provider_subscription_id: null,
    cancel_at_period_end: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function createMockSubWithPlan(
  subOverrides: Partial<Subscription> = {},
  planOverrides: Partial<Plan> = {},
): SubscriptionWithPlan {
  const plan = createMockPlan(planOverrides);
  const sub = createMockSubscription({ plan_id: plan.id, ...subOverrides });
  return { ...sub, plan };
}

export function createExpiredTrialSub(planOverrides: Partial<Plan> = {}): SubscriptionWithPlan {
  const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  return createMockSubWithPlan(
    {
      status: "trialing",
      trial_start: new Date(pastDate.getTime() - 14 * 24 * 60 * 60 * 1000),
      trial_end: pastDate,
    },
    planOverrides,
  );
}

export function createActiveTrialSub(
  daysRemaining: number = 10,
  planOverrides: Partial<Plan> = {},
): SubscriptionWithPlan {
  const futureDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
  return createMockSubWithPlan(
    {
      status: "trialing",
      trial_start: new Date(futureDate.getTime() - 14 * 24 * 60 * 60 * 1000),
      trial_end: futureDate,
    },
    planOverrides,
  );
}

export function createActivePaidSub(planOverrides: Partial<Plan> = {}): SubscriptionWithPlan {
  const now = new Date();
  return createMockSubWithPlan(
    {
      status: "active",
      trial_start: null,
      trial_end: null,
      current_period_start: now,
      current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
    planOverrides,
  );
}

// ─── Reset ───

export function resetIdCounter() {
  idCounter = 0;
}
