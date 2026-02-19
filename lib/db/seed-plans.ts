import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
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
    features: ["voice_capture", "timesheet", "dashboard", "export_csv", "export_pdf", "comments", "notifications", "file_attachments", "recurring_tasks", "priority_support"],
  },
];

async function seed() {
  console.log("Seeding plans...");

  for (const plan of DEFAULT_PLANS) {
    const existing = await db.query.plans.findFirst({
      where: (p, { eq }) => eq(p.slug, plan.slug),
    });

    if (existing) {
      console.log(`  Plan "${plan.name}" already exists, skipping.`);
      continue;
    }

    await db.insert(plans).values(plan);
    console.log(`  Created plan: ${plan.name}`);
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
