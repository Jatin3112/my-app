import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { plans } from "./schema";

// Direct connection (bypass server-only guard in index.ts)
const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/myapp";
const client = postgres(connectionString, { max: 1, idle_timeout: 5, prepare: true, ssl: false });
const db = drizzle(client, { schema });

const DEFAULT_PLANS = [
  {
    name: "Solo",
    slug: "solo",
    price_inr: 499,
    price_usd: 9,
    max_users: 1,
    max_projects: 3,
    max_workspaces: 1,
    max_storage_mb: 100,
    features: ["voice_capture", "timesheet", "dashboard", "export_csv"],
  },
  {
    name: "Team",
    slug: "team",
    price_inr: 999,
    price_usd: 19,
    max_users: 5,
    max_projects: 10,
    max_workspaces: 3,
    max_storage_mb: 1024,
    features: ["voice_capture", "timesheet", "dashboard", "export_csv", "export_pdf", "comments", "notifications"],
  },
  {
    name: "Agency",
    slug: "agency",
    price_inr: 1999,
    price_usd: 35,
    max_users: 15,
    max_projects: -1,
    max_workspaces: -1,
    max_storage_mb: 10240,
    features: ["voice_capture", "timesheet", "dashboard", "export_csv", "export_pdf", "comments", "notifications", "file_attachments", "recurring_tasks", "priority_support"],
  },
];

async function syncToRazorpay(planRecord: typeof plans.$inferSelect, planData: (typeof DEFAULT_PLANS)[number]) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.log("    Skipping Razorpay sync (no credentials)");
    return;
  }
  if (planRecord.razorpay_plan_id) {
    console.log(`    Razorpay plan already exists: ${planRecord.razorpay_plan_id}`);
    return;
  }

  const { createRazorpayPlan } = await import("../payments/razorpay");
  const rzPlanId = await createRazorpayPlan({
    name: planData.name,
    amount: planData.price_inr * 100, // convert to paise
    currency: "INR",
    period: "monthly",
    interval: 1,
  });

  await db.update(plans).set({ razorpay_plan_id: rzPlanId }).where(eq(plans.id, planRecord.id));
  console.log(`    Synced to Razorpay: ${rzPlanId}`);
}

async function syncToStripe(planRecord: typeof plans.$inferSelect, planData: (typeof DEFAULT_PLANS)[number]) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log("    Skipping Stripe sync (no credentials)");
    return;
  }
  if (planRecord.stripe_price_id) {
    console.log(`    Stripe price already exists: ${planRecord.stripe_price_id}`);
    return;
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const product = await stripe.products.create({
    name: `VoiceTask ${planData.name}`,
    description: `${planData.name} plan — $${planData.price_usd}/month`,
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: planData.price_usd * 100,
    currency: "usd",
    recurring: { interval: "month" },
  });

  await db.update(plans).set({ stripe_price_id: price.id }).where(eq(plans.id, planRecord.id));
  console.log(`    Synced to Stripe: ${price.id}`);
}

async function seed() {
  console.log("Seeding plans...");

  for (const plan of DEFAULT_PLANS) {
    let existing = await db.query.plans.findFirst({
      where: (p, { eq }) => eq(p.slug, plan.slug),
    });

    if (existing) {
      console.log(`  Plan "${plan.name}" already exists.`);
    } else {
      const [inserted] = await db.insert(plans).values(plan).returning();
      existing = inserted;
      console.log(`  Created plan: ${plan.name}`);
    }

    await syncToRazorpay(existing, plan);
    await syncToStripe(existing, plan);
  }

  console.log("Seeding complete.");
  await client.end();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await client.end();
  process.exit(1);
});
