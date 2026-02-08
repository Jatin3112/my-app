import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import {
  users,
  workspaces,
  workspaceMembers,
  projects,
  todos,
  timesheetEntries,
} from "../lib/db/schema";

async function main() {
  const connectionString = process.env.DATABASE_URL!;
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  console.log("Starting workspace migration...\n");

  const allUsers = await db.select().from(users);
  console.log(`Found ${allUsers.length} user(s) to migrate.\n`);

  for (const user of allUsers) {
    const displayName = user.name || user.email.split("@")[0];
    const workspaceName = `${displayName}'s Workspace`;

    const slug =
      displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") + `-${Date.now()}`;

    console.log(`Migrating user: ${user.email}`);
    console.log(`  Creating workspace: "${workspaceName}" (slug: ${slug})`);

    // Create the workspace
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: workspaceName,
        slug,
        owner_id: user.id,
      })
      .returning();

    console.log(`  Workspace created with id: ${workspace.id}`);

    // Add user as owner in workspace_members
    await db.insert(workspaceMembers).values({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    });
    console.log(`  Added user as owner in workspace_members`);

    // Update all projects for this user
    const updatedProjects = await db
      .update(projects)
      .set({ workspace_id: workspace.id } as any)
      .where(eq(projects.user_id, user.id))
      .returning();
    console.log(`  Updated ${updatedProjects.length} project(s)`);

    // Update all todos for this user
    const updatedTodos = await db
      .update(todos)
      .set({ workspace_id: workspace.id } as any)
      .where(eq(todos.user_id, user.id))
      .returning();
    console.log(`  Updated ${updatedTodos.length} todo(s)`);

    // Update all timesheet entries for this user
    const updatedTimesheets = await db
      .update(timesheetEntries)
      .set({ workspace_id: workspace.id } as any)
      .where(eq(timesheetEntries.user_id, user.id))
      .returning();
    console.log(`  Updated ${updatedTimesheets.length} timesheet entry/entries`);

    console.log(`  Done migrating user: ${user.email}\n`);
  }

  console.log("Workspace migration complete!");

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
