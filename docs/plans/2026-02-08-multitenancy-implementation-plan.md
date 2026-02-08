# Multi-tenancy, RBAC & Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the single-user task manager into a multi-tenant SaaS with workspaces, RBAC, comments, and real-time notifications.

**Architecture:** Shared-database multi-tenancy with `workspace_id` column on all data tables. RBAC enforced server-side via centralized permission checks. SSE for real-time notification delivery. All existing API functions gain `workspaceId` parameter and permission gates.

**Tech Stack:** Next.js 16, Drizzle ORM (PostgreSQL), NextAuth.js, Server-Sent Events, React Context for workspace state.

**Design doc:** `docs/plans/2026-02-08-multitenancy-rbac-notifications-design.md`

---

## Task 1: Database Schema — New Tables

**Files:**
- Modify: `lib/db/schema.ts`

**Step 1: Add new table definitions to schema.ts**

Add the following tables after the existing `timesheetEntries` table definition in `lib/db/schema.ts`:

```typescript
import { pgTable, uuid, text, timestamp, boolean, date, doublePrecision, integer, uniqueIndex, json } from "drizzle-orm/pg-core";

// --- NEW TABLES ---

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  owner_id: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull(), // 'owner' | 'admin' | 'member'
  joined_at: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("workspace_members_workspace_user_idx").on(table.workspace_id, table.user_id),
]);

export const workspaceInvitations = pgTable("workspace_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(), // role to assign on acceptance
  invited_by: uuid("invited_by").references(() => users.id).notNull(),
  token: text("token").unique().notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'expired'
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  todo_id: uuid("todo_id").references(() => todos.id, { onDelete: "cascade" }).notNull(),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  recipient_id: uuid("recipient_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  actor_id: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  entity_type: text("entity_type").notNull(), // 'todo' | 'project' | 'workspace' | 'comment'
  entity_id: uuid("entity_id"),
  message: text("message").notNull(),
  is_read: boolean("is_read").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  muted_types: json("muted_types").$type<string[]>().default([]),
  muted: boolean("muted").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("notification_prefs_user_workspace_idx").on(table.user_id, table.workspace_id),
]);
```

**Step 2: Add `workspace_id` to existing tables**

Modify the existing `projects`, `todos`, and `timesheetEntries` table definitions to add a `workspace_id` column:

```typescript
// In projects table — add after user_id:
workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),

// In todos table — add after user_id:
workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),

// In timesheetEntries table — add after user_id:
workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
```

Note: `workspace_id` starts nullable for the migration. After running the data migration script (Task 2), we'll make it NOT NULL in a follow-up migration.

**Step 3: Update relations**

Replace the entire relations section at the bottom of schema.ts with:

```typescript
// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  todos: many(todos),
  timesheetEntries: many(timesheetEntries),
  ownedWorkspaces: many(workspaces),
  workspaceMemberships: many(workspaceMembers),
  comments: many(comments),
  notifications: many(notifications),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.owner_id],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  invitations: many(workspaceInvitations),
  projects: many(projects),
  todos: many(todos),
  timesheetEntries: many(timesheetEntries),
  comments: many(comments),
  notifications: many(notifications),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspace_id],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.user_id],
    references: [users.id],
  }),
}));

export const workspaceInvitationsRelations = relations(workspaceInvitations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceInvitations.workspace_id],
    references: [workspaces.id],
  }),
  inviter: one(users, {
    fields: [workspaceInvitations.invited_by],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.user_id],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [projects.workspace_id],
    references: [workspaces.id],
  }),
  todos: many(todos),
}));

export const todosRelations = relations(todos, ({ one, many }) => ({
  user: one(users, {
    fields: [todos.user_id],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [todos.project_id],
    references: [projects.id],
  }),
  workspace: one(workspaces, {
    fields: [todos.workspace_id],
    references: [workspaces.id],
  }),
  comments: many(comments),
}));

export const timesheetEntriesRelations = relations(timesheetEntries, ({ one }) => ({
  user: one(users, {
    fields: [timesheetEntries.user_id],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [timesheetEntries.workspace_id],
    references: [workspaces.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  todo: one(todos, {
    fields: [comments.todo_id],
    references: [todos.id],
  }),
  workspace: one(workspaces, {
    fields: [comments.workspace_id],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [comments.user_id],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [notifications.workspace_id],
    references: [workspaces.id],
  }),
  recipient: one(users, {
    fields: [notifications.recipient_id],
    references: [users.id],
    relationName: "notificationRecipient",
  }),
  actor: one(users, {
    fields: [notifications.actor_id],
    references: [users.id],
    relationName: "notificationActor",
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.user_id],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [notificationPreferences.workspace_id],
    references: [workspaces.id],
  }),
}));
```

**Step 4: Update type exports**

Add the following type exports at the bottom of schema.ts:

```typescript
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;

export type WorkspaceInvitation = typeof workspaceInvitations.$inferSelect;
export type NewWorkspaceInvitation = typeof workspaceInvitations.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
```

**Step 5: Generate migration**

Run: `npx drizzle-kit generate`

**Step 6: Push migration to database**

Run: `npx drizzle-kit push`

**Step 7: Commit**

```
feat: add multi-tenancy schema — workspaces, members, invitations, comments, notifications tables
```

---

## Task 2: Data Migration Script

**Files:**
- Create: `scripts/migrate-to-workspaces.ts`

**Step 1: Create the migration script**

This script creates a default workspace for each existing user and assigns their existing data to it.

```typescript
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, workspaces, workspaceMembers, projects, todos, timesheetEntries } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function migrate() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  console.log("Starting workspace migration...");

  const allUsers = await db.select().from(users);
  console.log(`Found ${allUsers.length} users to migrate`);

  for (const user of allUsers) {
    const workspaceName = `${user.name || user.email.split("@")[0]}'s Workspace`;
    const slug = (user.name || user.email.split("@")[0])
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-workspace";

    console.log(`Creating workspace "${workspaceName}" for user ${user.email}`);

    // Create workspace
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: workspaceName,
        slug: slug + "-" + Date.now(), // ensure uniqueness
        owner_id: user.id,
        updated_at: new Date(),
      })
      .returning();

    // Add user as owner member
    await db.insert(workspaceMembers).values({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    });

    // Update all user's projects
    await db
      .update(projects)
      .set({ workspace_id: workspace.id } as any)
      .where(eq(projects.user_id, user.id));

    // Update all user's todos
    await db
      .update(todos)
      .set({ workspace_id: workspace.id } as any)
      .where(eq(todos.user_id, user.id));

    // Update all user's timesheet entries
    await db
      .update(timesheetEntries)
      .set({ workspace_id: workspace.id } as any)
      .where(eq(timesheetEntries.user_id, user.id));

    console.log(`  -> Migrated workspace ${workspace.id}`);
  }

  console.log("Migration complete!");
  await client.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

**Step 2: Run the migration script**

Run: `npx tsx scripts/migrate-to-workspaces.ts`

Verify all existing data has `workspace_id` populated.

**Step 3: Commit**

```
feat: data migration script — assign existing data to default workspaces
```

---

## Task 3: Permissions Utility (RBAC)

**Files:**
- Create: `lib/auth/permissions.ts`

**Step 1: Create the permissions module**

```typescript
"use server"

import { db } from "@/lib/db"
import { workspaceMembers } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export type Role = "owner" | "admin" | "member"

export type Action =
  | "workspace:delete"
  | "workspace:update"
  | "members:invite"
  | "members:remove"
  | "members:change_role"
  | "ownership:transfer"
  | "project:create"
  | "project:edit_any"
  | "project:delete_any"
  | "todo:create"
  | "todo:edit_any"
  | "todo:delete_any"
  | "todo:assign"
  | "todo:view_all"
  | "timesheet:view_all"
  | "timesheet:edit_any"
  | "timesheet:delete_any"
  | "comment:delete_any"

const PERMISSIONS: Record<Action, Role[]> = {
  "workspace:delete": ["owner"],
  "workspace:update": ["owner", "admin"],
  "members:invite": ["owner", "admin"],
  "members:remove": ["owner", "admin"],
  "members:change_role": ["owner", "admin"],
  "ownership:transfer": ["owner"],
  "project:create": ["owner", "admin", "member"],
  "project:edit_any": ["owner", "admin"],
  "project:delete_any": ["owner", "admin"],
  "todo:create": ["owner", "admin", "member"],
  "todo:edit_any": ["owner", "admin"],
  "todo:delete_any": ["owner", "admin"],
  "todo:assign": ["owner", "admin", "member"],
  "todo:view_all": ["owner", "admin", "member"],
  "timesheet:view_all": ["owner", "admin"],
  "timesheet:edit_any": ["owner", "admin"],
  "timesheet:delete_any": ["owner", "admin"],
  "comment:delete_any": ["owner", "admin"],
}

export async function getMemberRole(userId: string, workspaceId: string): Promise<Role | null> {
  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspace_id, workspaceId),
      eq(workspaceMembers.user_id, userId)
    ),
  })
  return (member?.role as Role) ?? null
}

export async function checkPermission(
  userId: string,
  workspaceId: string,
  action: Action
): Promise<{ allowed: boolean; role: Role | null }> {
  const role = await getMemberRole(userId, workspaceId)
  if (!role) return { allowed: false, role: null }

  const allowedRoles = PERMISSIONS[action]
  return { allowed: allowedRoles.includes(role), role }
}

export async function requirePermission(
  userId: string,
  workspaceId: string,
  action: Action
): Promise<Role> {
  const { allowed, role } = await checkPermission(userId, workspaceId, action)
  if (!allowed) {
    throw new Error(`Permission denied: ${action}`)
  }
  return role!
}
```

**Step 2: Commit**

```
feat: add RBAC permissions utility with role-based action checks
```

---

## Task 4: Workspace API Functions

**Files:**
- Create: `lib/api/workspaces.ts`

**Step 1: Create workspace CRUD functions**

```typescript
"use server"

import { db } from "@/lib/db"
import { workspaces, workspaceMembers, type Workspace } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { requirePermission } from "@/lib/auth/permissions"

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Math.random().toString(36).substring(2, 8)
}

export async function createWorkspace(userId: string, data: { name: string }): Promise<Workspace> {
  const slug = generateSlug(data.name)

  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: data.name,
      slug,
      owner_id: userId,
      updated_at: new Date(),
    })
    .returning()

  // Add creator as owner
  await db.insert(workspaceMembers).values({
    workspace_id: workspace.id,
    user_id: userId,
    role: "owner",
  })

  return workspace
}

export async function getWorkspacesForUser(userId: string) {
  const memberships = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.user_id, userId),
    with: {
      workspace: true,
    },
  })

  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }))
}

export async function getWorkspaceById(workspaceId: string): Promise<Workspace | undefined> {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  })
}

export async function updateWorkspace(
  userId: string,
  workspaceId: string,
  data: { name: string }
): Promise<Workspace> {
  await requirePermission(userId, workspaceId, "workspace:update")

  const [workspace] = await db
    .update(workspaces)
    .set({ name: data.name, updated_at: new Date() })
    .where(eq(workspaces.id, workspaceId))
    .returning()

  return workspace
}

export async function deleteWorkspace(userId: string, workspaceId: string): Promise<void> {
  await requirePermission(userId, workspaceId, "workspace:delete")
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId))
}
```

**Step 2: Commit**

```
feat: add workspace CRUD API functions
```

---

## Task 5: Member Management API

**Files:**
- Create: `lib/api/members.ts`
- Create: `lib/api/invitations.ts`

**Step 1: Create member management functions** (`lib/api/members.ts`)

```typescript
"use server"

import { db } from "@/lib/db"
import { workspaceMembers, users } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { requirePermission, getMemberRole, type Role } from "@/lib/auth/permissions"

export async function getWorkspaceMembers(workspaceId: string) {
  const members = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspace_id, workspaceId),
    with: {
      user: true,
    },
  })

  return members.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    name: m.user.name,
    email: m.user.email,
  }))
}

export async function removeMember(
  actorId: string,
  workspaceId: string,
  targetUserId: string
): Promise<void> {
  await requirePermission(actorId, workspaceId, "members:remove")

  const targetRole = await getMemberRole(targetUserId, workspaceId)
  if (targetRole === "owner") {
    throw new Error("Cannot remove the workspace owner")
  }

  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, targetUserId)
      )
    )
}

export async function updateMemberRole(
  actorId: string,
  workspaceId: string,
  targetUserId: string,
  newRole: Role
): Promise<void> {
  await requirePermission(actorId, workspaceId, "members:change_role")

  const targetRole = await getMemberRole(targetUserId, workspaceId)
  if (targetRole === "owner") {
    throw new Error("Cannot change the owner's role")
  }
  if (newRole === "owner") {
    throw new Error("Use transferOwnership to change owner")
  }

  await db
    .update(workspaceMembers)
    .set({ role: newRole })
    .where(
      and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, targetUserId)
      )
    )
}

export async function transferOwnership(
  currentOwnerId: string,
  workspaceId: string,
  newOwnerId: string
): Promise<void> {
  await requirePermission(currentOwnerId, workspaceId, "ownership:transfer")

  // Verify new owner is a member
  const newOwnerRole = await getMemberRole(newOwnerId, workspaceId)
  if (!newOwnerRole) {
    throw new Error("Target user is not a member of this workspace")
  }

  // Demote current owner to admin
  await db
    .update(workspaceMembers)
    .set({ role: "admin" })
    .where(
      and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, currentOwnerId)
      )
    )

  // Promote new owner
  await db
    .update(workspaceMembers)
    .set({ role: "owner" })
    .where(
      and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, newOwnerId)
      )
    )

  // Update workspace owner_id
  await db
    .update(workspaces)
    .set({ owner_id: newOwnerId, updated_at: new Date() })
    .where(eq(workspaces.id, workspaceId))

  // Import at top of file
  // import { workspaces } from "@/lib/db/schema"
}

export async function leaveWorkspace(userId: string, workspaceId: string): Promise<void> {
  const role = await getMemberRole(userId, workspaceId)
  if (role === "owner") {
    throw new Error("Owner cannot leave. Transfer ownership first.")
  }

  await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, userId)
      )
    )
}
```

Note: Import `workspaces` at the top of the actual file for `transferOwnership`.

**Step 2: Create invitation functions** (`lib/api/invitations.ts`)

```typescript
"use server"

import { db } from "@/lib/db"
import { workspaceInvitations, workspaceMembers, users } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { requirePermission, type Role } from "@/lib/auth/permissions"
import { randomBytes } from "crypto"

export async function inviteMember(
  actorId: string,
  workspaceId: string,
  data: { email: string; role: Role }
): Promise<{ token: string }> {
  await requirePermission(actorId, workspaceId, "members:invite")

  // Check if already a member
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  })

  if (existingUser) {
    const existingMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspace_id, workspaceId),
        eq(workspaceMembers.user_id, existingUser.id)
      ),
    })
    if (existingMember) {
      throw new Error("User is already a member of this workspace")
    }
  }

  // Check for pending invite
  const existingInvite = await db.query.workspaceInvitations.findFirst({
    where: and(
      eq(workspaceInvitations.workspace_id, workspaceId),
      eq(workspaceInvitations.email, data.email),
      eq(workspaceInvitations.status, "pending")
    ),
  })
  if (existingInvite) {
    throw new Error("An invitation has already been sent to this email")
  }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  await db.insert(workspaceInvitations).values({
    workspace_id: workspaceId,
    email: data.email,
    role: data.role,
    invited_by: actorId,
    token,
    status: "pending",
    expires_at: expiresAt,
  })

  return { token }
}

export async function getWorkspaceInvitations(workspaceId: string) {
  return db.query.workspaceInvitations.findMany({
    where: and(
      eq(workspaceInvitations.workspace_id, workspaceId),
      eq(workspaceInvitations.status, "pending")
    ),
    with: {
      inviter: true,
    },
  })
}

export async function acceptInvitation(token: string, userId: string) {
  const invitation = await db.query.workspaceInvitations.findFirst({
    where: and(
      eq(workspaceInvitations.token, token),
      eq(workspaceInvitations.status, "pending")
    ),
    with: {
      workspace: true,
    },
  })

  if (!invitation) {
    throw new Error("Invitation not found or already used")
  }

  if (new Date() > invitation.expires_at) {
    await db
      .update(workspaceInvitations)
      .set({ status: "expired" })
      .where(eq(workspaceInvitations.id, invitation.id))
    throw new Error("Invitation has expired")
  }

  // Check not already a member
  const existingMember = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspace_id, invitation.workspace_id),
      eq(workspaceMembers.user_id, userId)
    ),
  })
  if (existingMember) {
    throw new Error("You are already a member of this workspace")
  }

  // Add as member
  await db.insert(workspaceMembers).values({
    workspace_id: invitation.workspace_id,
    user_id: userId,
    role: invitation.role,
  })

  // Mark invitation as accepted
  await db
    .update(workspaceInvitations)
    .set({ status: "accepted" })
    .where(eq(workspaceInvitations.id, invitation.id))

  return { workspaceId: invitation.workspace_id, workspaceName: invitation.workspace.name }
}

export async function cancelInvitation(
  actorId: string,
  workspaceId: string,
  invitationId: string
): Promise<void> {
  await requirePermission(actorId, workspaceId, "members:invite")

  await db
    .delete(workspaceInvitations)
    .where(eq(workspaceInvitations.id, invitationId))
}
```

**Step 3: Commit**

```
feat: add member management and invitation API functions
```

---

## Task 6: Migrate Existing API Functions to Workspace Scope

**Files:**
- Modify: `lib/api/todos.ts`
- Modify: `lib/api/projects.ts`
- Modify: `lib/api/timesheet.ts`
- Modify: `lib/api/dashboard.ts`
- Modify: `lib/api/bulk-actions.ts`
- Modify: `lib/api/reorder.ts`

**Step 1: Update `lib/api/todos.ts`**

All functions gain `workspaceId` parameter. Queries scope by `workspace_id` instead of just `user_id`. Permission checks for destructive actions.

```typescript
"use server"

import { db } from '../db'
import { todos, type Todo, type NewTodo } from '../db/schema'
import { eq, and, asc, max } from 'drizzle-orm'
import { requirePermission, getMemberRole } from '@/lib/auth/permissions'

export async function getTodos(workspaceId: string, userId: string, project_id?: string): Promise<Todo[]> {
  await requirePermission(userId, workspaceId, "todo:view_all")

  const conditions = [eq(todos.workspace_id, workspaceId)]

  if (project_id) {
    conditions.push(eq(todos.project_id, project_id))
  }

  const data = await db.query.todos.findMany({
    where: and(...conditions),
    orderBy: [asc(todos.sort_order), asc(todos.created_at)],
  })

  return data
}

export async function createTodo(workspaceId: string, userId: string, todo: Omit<NewTodo, 'user_id' | 'workspace_id'>): Promise<Todo> {
  await requirePermission(userId, workspaceId, "todo:create")

  const result = await db
    .select({ maxOrder: max(todos.sort_order) })
    .from(todos)
    .where(eq(todos.workspace_id, workspaceId))

  const nextOrder = (result[0]?.maxOrder ?? -1) + 1

  const [data] = await db.insert(todos)
    .values({
      ...todo,
      user_id: userId,
      workspace_id: workspaceId,
      sort_order: nextOrder,
      updated_at: new Date()
    } as any)
    .returning()

  return data
}

export async function updateTodo(workspaceId: string, userId: string, id: string, todo: Partial<NewTodo>): Promise<Todo> {
  // Check if user owns the todo or has edit_any permission
  const existing = await db.query.todos.findFirst({ where: eq(todos.id, id) })
  if (!existing) throw new Error("Todo not found")

  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "todo:edit_any")
  }

  const [data] = await db.update(todos)
    .set({
      ...todo,
      updated_at: new Date()
    } as any)
    .where(eq(todos.id, id))
    .returning()

  return data
}

export async function toggleTodoComplete(workspaceId: string, userId: string, id: string, completed: boolean): Promise<Todo> {
  const existing = await db.query.todos.findFirst({ where: eq(todos.id, id) })
  if (!existing) throw new Error("Todo not found")

  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "todo:edit_any")
  }

  const [data] = await db.update(todos)
    .set({ completed, updated_at: new Date() })
    .where(eq(todos.id, id))
    .returning()

  return data
}

export async function deleteTodo(workspaceId: string, userId: string, id: string): Promise<void> {
  const existing = await db.query.todos.findFirst({ where: eq(todos.id, id) })
  if (!existing) throw new Error("Todo not found")

  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "todo:delete_any")
  }

  await db.delete(todos).where(eq(todos.id, id))
}
```

**Step 2: Update `lib/api/projects.ts`**

```typescript
"use server"

import { db } from '../db'
import { projects, type Project, type NewProject } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { requirePermission } from '@/lib/auth/permissions'

export async function getProjects(workspaceId: string, userId: string): Promise<Project[]> {
  await requirePermission(userId, workspaceId, "todo:view_all")

  const data = await db.query.projects.findMany({
    where: eq(projects.workspace_id, workspaceId),
  })

  return data
}

export async function createProject(workspaceId: string, userId: string, project: Omit<NewProject, 'user_id' | 'workspace_id'>): Promise<Project> {
  await requirePermission(userId, workspaceId, "project:create")

  const [data] = await db.insert(projects)
    .values({
      ...project,
      user_id: userId,
      workspace_id: workspaceId,
      updated_at: new Date()
    } as any)
    .returning()

  return data
}

export async function updateProject(workspaceId: string, userId: string, id: string, project: Partial<NewProject>): Promise<Project> {
  const existing = await db.query.projects.findFirst({ where: eq(projects.id, id) })
  if (!existing) throw new Error("Project not found")

  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "project:edit_any")
  }

  const [data] = await db.update(projects)
    .set({
      ...project,
      updated_at: new Date()
    } as any)
    .where(eq(projects.id, id))
    .returning()

  return data
}

export async function deleteProject(workspaceId: string, userId: string, id: string): Promise<void> {
  const existing = await db.query.projects.findFirst({ where: eq(projects.id, id) })
  if (!existing) throw new Error("Project not found")

  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "project:delete_any")
  }

  await db.delete(projects).where(eq(projects.id, id))
}
```

**Step 3: Update `lib/api/timesheet.ts`**

```typescript
"use server"

import { db } from '../db'
import { timesheetEntries, type TimesheetEntry, type NewTimesheetEntry } from '../db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { requirePermission, getMemberRole } from '@/lib/auth/permissions'

export async function getTimesheetEntries(workspaceId: string, userId: string, startDate?: string, endDate?: string): Promise<TimesheetEntry[]> {
  const role = await getMemberRole(userId, workspaceId)
  if (!role) throw new Error("Not a member of this workspace")

  // Members see only their own, admin/owner see all
  const conditions = [eq(timesheetEntries.workspace_id, workspaceId)]

  if (role === "member") {
    conditions.push(eq(timesheetEntries.user_id, userId))
  }

  if (startDate) {
    conditions.push(gte(timesheetEntries.date, startDate))
  }

  if (endDate) {
    conditions.push(lte(timesheetEntries.date, endDate))
  }

  const data = await db.query.timesheetEntries.findMany({
    where: and(...conditions),
    orderBy: [desc(timesheetEntries.date), desc(timesheetEntries.created_at)],
  })

  return data
}

export async function createTimesheetEntry(workspaceId: string, userId: string, entry: Omit<NewTimesheetEntry, 'user_id' | 'workspace_id'>): Promise<TimesheetEntry> {
  const role = await getMemberRole(userId, workspaceId)
  if (!role) throw new Error("Not a member of this workspace")

  const [data] = await db.insert(timesheetEntries)
    .values({
      ...entry,
      user_id: userId,
      workspace_id: workspaceId,
      updated_at: new Date()
    } as any)
    .returning()

  return data
}

export async function updateTimesheetEntry(workspaceId: string, userId: string, id: string, entry: Partial<NewTimesheetEntry>): Promise<TimesheetEntry> {
  const existing = await db.query.timesheetEntries.findFirst({ where: eq(timesheetEntries.id, id) })
  if (!existing) throw new Error("Entry not found")

  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "timesheet:edit_any")
  }

  const [data] = await db.update(timesheetEntries)
    .set({
      ...entry,
      updated_at: new Date()
    } as any)
    .where(eq(timesheetEntries.id, id))
    .returning()

  return data
}

export async function deleteTimesheetEntry(workspaceId: string, userId: string, id: string): Promise<void> {
  const existing = await db.query.timesheetEntries.findFirst({ where: eq(timesheetEntries.id, id) })
  if (!existing) throw new Error("Entry not found")

  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "timesheet:delete_any")
  }

  await db.delete(timesheetEntries).where(eq(timesheetEntries.id, id))
}
```

**Step 4: Update `lib/api/dashboard.ts`**

```typescript
"use server"

import { db } from "@/lib/db"
import { projects, todos, timesheetEntries, workspaceMembers } from "@/lib/db/schema"
import { eq, and, count, sum, gte, lte } from "drizzle-orm"

export type DashboardStats = {
  totalProjects: number
  totalTodos: number
  completedTodos: number
  pendingTodos: number
  totalHoursLogged: number
  thisWeekHours: number
  totalMembers: number
}

function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const start = new Date(now)
  start.setDate(now.getDate() - dayOfWeek)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  }
}

export async function getDashboardStats(workspaceId: string): Promise<DashboardStats> {
  const week = getWeekRange()

  const [projectCount, todoCount, completedCount, totalHours, weekHours, memberCount] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.workspace_id, workspaceId)),
      db
        .select({ count: count() })
        .from(todos)
        .where(eq(todos.workspace_id, workspaceId)),
      db
        .select({ count: count() })
        .from(todos)
        .where(and(eq(todos.workspace_id, workspaceId), eq(todos.completed, true))),
      db
        .select({ total: sum(timesheetEntries.hours) })
        .from(timesheetEntries)
        .where(eq(timesheetEntries.workspace_id, workspaceId)),
      db
        .select({ total: sum(timesheetEntries.hours) })
        .from(timesheetEntries)
        .where(
          and(
            eq(timesheetEntries.workspace_id, workspaceId),
            gte(timesheetEntries.date, week.start),
            lte(timesheetEntries.date, week.end)
          )
        ),
      db
        .select({ count: count() })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspace_id, workspaceId)),
    ])

  const totalTodos = todoCount[0].count
  const completed = completedCount[0].count

  return {
    totalProjects: projectCount[0].count,
    totalTodos,
    completedTodos: completed,
    pendingTodos: totalTodos - completed,
    totalHoursLogged: Number(totalHours[0].total) || 0,
    thisWeekHours: Number(weekHours[0].total) || 0,
    totalMembers: memberCount[0].count,
  }
}
```

**Step 5: Update `lib/api/bulk-actions.ts`**

```typescript
"use server"

import { db } from "@/lib/db"
import { todos, timesheetEntries } from "@/lib/db/schema"
import { inArray } from "drizzle-orm"

export async function bulkDeleteTodos(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await db.delete(todos).where(inArray(todos.id, ids))
}

export async function bulkToggleTodos(ids: string[], completed: boolean): Promise<void> {
  if (ids.length === 0) return
  await db
    .update(todos)
    .set({ completed, updated_at: new Date() })
    .where(inArray(todos.id, ids))
}

export async function bulkDeleteTimesheetEntries(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await db.delete(timesheetEntries).where(inArray(timesheetEntries.id, ids))
}
```

Note: Bulk actions keep the same signature — permission checking happens at the component level before calling these. The workspace scoping ensures data isolation through the IDs (which are already filtered by workspace in the UI).

**Step 6: Update `lib/api/reorder.ts`** — no signature change needed, same logic.

**Step 7: Commit**

```
feat: migrate all API functions to workspace-scoped queries with RBAC
```

---

## Task 7: Workspace Context Provider & Hook

**Files:**
- Create: `hooks/use-workspace.tsx`

**Step 1: Create workspace context**

```typescript
"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { getWorkspacesForUser, createWorkspace } from "@/lib/api/workspaces"

type WorkspaceWithRole = {
  id: string
  name: string
  slug: string
  owner_id: string
  role: string
  created_at: Date
  updated_at: Date
}

type WorkspaceContextType = {
  workspaces: WorkspaceWithRole[]
  currentWorkspace: WorkspaceWithRole | null
  switchWorkspace: (workspaceId: string) => void
  refreshWorkspaces: () => Promise<void>
  isLoading: boolean
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

const STORAGE_KEY = "last-workspace-id"

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id

  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceWithRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadWorkspaces = useCallback(async () => {
    if (!userId) return
    try {
      const data = await getWorkspacesForUser(userId)
      setWorkspaces(data)

      if (data.length === 0) {
        // First-time user — create default workspace
        const name = session?.user?.name || session?.user?.email?.split("@")[0] || "My"
        const newWorkspace = await createWorkspace(userId, { name: `${name}'s Workspace` })
        const reloaded = await getWorkspacesForUser(userId)
        setWorkspaces(reloaded)
        setCurrentWorkspace(reloaded[0])
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, reloaded[0].id)
        }
        return
      }

      // Restore last used workspace
      const lastId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
      const lastWorkspace = lastId ? data.find((w) => w.id === lastId) : null
      setCurrentWorkspace(lastWorkspace || data[0])
    } catch (error) {
      console.error("Failed to load workspaces:", error)
    } finally {
      setIsLoading(false)
    }
  }, [userId, session])

  useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])

  function switchWorkspace(workspaceId: string) {
    const workspace = workspaces.find((w) => w.id === workspaceId)
    if (workspace) {
      setCurrentWorkspace(workspace)
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, workspaceId)
      }
    }
  }

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        switchWorkspace,
        refreshWorkspaces: loadWorkspaces,
        isLoading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider")
  }
  return context
}
```

**Step 2: Add WorkspaceProvider to layout**

Modify `app/layout.tsx` — wrap `SessionProvider` children with `WorkspaceProvider`:

```typescript
import { WorkspaceProvider } from "@/hooks/use-workspace"

// Inside RootLayout, wrap like this:
<SessionProvider>
  <WorkspaceProvider>
    {children}
    <Toaster />
  </WorkspaceProvider>
</SessionProvider>
```

**Step 3: Commit**

```
feat: add workspace context provider with auto-creation and workspace switching
```

---

## Task 8: Workspace Switcher UI

**Files:**
- Create: `components/workspace/workspace-switcher.tsx`
- Modify: `components/layout/sidebar.tsx`

**Step 1: Create workspace switcher component**

```typescript
"use client"

import { useState } from "react"
import { useWorkspace } from "@/hooks/use-workspace"
import { useSession } from "next-auth/react"
import { createWorkspace } from "@/lib/api/workspaces"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronsUpDown, Plus, Check } from "lucide-react"
import { toast } from "sonner"

interface WorkspaceSwitcherProps {
  collapsed?: boolean
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const { workspaces, currentWorkspace, switchWorkspace, refreshWorkspaces } = useWorkspace()
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !newName.trim()) return

    setIsCreating(true)
    try {
      const workspace = await createWorkspace(userId, { name: newName.trim() })
      await refreshWorkspaces()
      switchWorkspace(workspace.id)
      toast.success("Workspace created")
      setIsCreateOpen(false)
      setNewName("")
    } catch (error) {
      toast.error("Failed to create workspace")
      console.error(error)
    } finally {
      setIsCreating(false)
    }
  }

  if (!currentWorkspace) return null

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      member: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    }
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[role] || colors.member}`}>
        {role}
      </span>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-between gap-2 ${collapsed ? "px-2" : "px-3"}`}
            title={collapsed ? currentWorkspace.name : undefined}
          >
            {collapsed ? (
              <span className="text-sm font-semibold truncate">
                {currentWorkspace.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold truncate">{currentWorkspace.name}</span>
                {roleBadge(currentWorkspace.role)}
              </div>
            )}
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((w) => (
            <DropdownMenuItem
              key={w.id}
              onClick={() => switchWorkspace(w.id)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                {w.id === currentWorkspace.id && <Check className="size-3.5 shrink-0" />}
                <span className="truncate">{w.name}</span>
              </div>
              {roleBadge(w.role)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4 mr-2" />
            Create Workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
              <DialogDescription>
                Create a new workspace to collaborate with your team.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Acme Corp"
                required
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

**Step 2: Add WorkspaceSwitcher to sidebar**

In `components/layout/sidebar.tsx`, add the WorkspaceSwitcher above the nav:

```typescript
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher"

// Inside the Sidebar component, add above <nav>:
<div className="p-2 border-b">
  <WorkspaceSwitcher collapsed={collapsed} />
</div>
```

Also add it to `MobileSidebarContent`:

```typescript
<div className="p-2 border-b">
  <WorkspaceSwitcher />
</div>
```

**Step 3: Commit**

```
feat: add workspace switcher dropdown to sidebar
```

---

## Task 9: Update All UI Components for Workspace Context

**Files:**
- Modify: `components/todos/todo-list.tsx`
- Modify: `components/todos/project-manager.tsx`
- Modify: `components/timesheet/timesheet-list.tsx`
- Modify: `components/dashboard/stats-cards.tsx`
- Modify: `app/page.tsx`

**Step 1: Update TodoList**

Replace all instances of `userId` being passed directly with `workspaceId` + `userId`. Key changes:

- Add `import { useWorkspace } from "@/hooks/use-workspace"`
- Get `const { currentWorkspace } = useWorkspace()`
- Get `const workspaceId = currentWorkspace?.id`
- Add `workspaceId` as dependency in useEffect
- Update all API calls:
  - `getTodos(userId)` → `getTodos(workspaceId, userId)`
  - `createTodo(userId, todoData)` → `createTodo(workspaceId, userId, todoData)`
  - `updateTodo(id, todoData)` → `updateTodo(workspaceId, userId, id, todoData)`
  - `toggleTodoComplete(id, !todo.completed)` → `toggleTodoComplete(workspaceId, userId, id, !todo.completed)`
  - `deleteTodo(id)` → `deleteTodo(workspaceId, userId, id)`
  - `getProjects(userId)` → `getProjects(workspaceId, userId)`
- Guard on both `userId && workspaceId` for loads and submissions

**Step 2: Update ProjectManager**

Same pattern:
- `getProjects(userId)` → `getProjects(workspaceId, userId)`
- `createProject(userId, formData)` → `createProject(workspaceId, userId, formData)`
- `updateProject(id, formData)` → `updateProject(workspaceId, userId, id, formData)`
- `deleteProject(id)` → `deleteProject(workspaceId, userId, id)`

**Step 3: Update TimesheetList**

Same pattern:
- `getTimesheetEntries(userId, ...)` → `getTimesheetEntries(workspaceId, userId, ...)`
- `createTimesheetEntry(userId, ...)` → `createTimesheetEntry(workspaceId, userId, ...)`
- `updateTimesheetEntry(id, ...)` → `updateTimesheetEntry(workspaceId, userId, id, ...)`
- `deleteTimesheetEntry(id)` → `deleteTimesheetEntry(workspaceId, userId, id)`
- `getProjects(userId)` → `getProjects(workspaceId, userId)`

**Step 4: Update StatsCards**

- `getDashboardStats(userId)` → `getDashboardStats(workspaceId)`
- Add member count stat card
- Use workspace context, guard on `workspaceId`

**Step 5: Commit**

```
feat: update all UI components to use workspace context for data scoping
```

---

## Task 10: Invitation Acceptance Page

**Files:**
- Create: `app/invite/[token]/page.tsx`
- Modify: `middleware.ts` — allow `/invite/:path*` for authenticated users
- Modify: `app/api/auth/register/route.ts` — handle invite token on registration

**Step 1: Create invite acceptance page**

```typescript
"use client"

import { use, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { acceptInvitation } from "@/lib/api/invitations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const { data: session, status } = useSession()
  const userId = (session?.user as any)?.id
  const router = useRouter()

  const [state, setState] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [workspaceName, setWorkspaceName] = useState("")

  useEffect(() => {
    if (status === "loading") return

    if (!userId) {
      // Redirect to login, preserving the invite token
      router.push(`/login?invite=${token}`)
      return
    }

    acceptInvitation(token, userId)
      .then((result) => {
        setState("success")
        setWorkspaceName(result.workspaceName)
      })
      .catch((err) => {
        setState("error")
        setMessage(err.message || "Failed to accept invitation")
      })
  }, [userId, token, status, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {state === "loading" && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
              <CardTitle>Accepting invitation...</CardTitle>
              <CardDescription>Please wait while we add you to the workspace.</CardDescription>
            </>
          )}
          {state === "success" && (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="size-8 text-green-500" />
              </div>
              <CardTitle>Welcome to {workspaceName}!</CardTitle>
              <CardDescription>You have been added to the workspace.</CardDescription>
            </>
          )}
          {state === "error" && (
            <>
              <div className="flex justify-center mb-4">
                <XCircle className="size-8 text-destructive" />
              </div>
              <CardTitle>Invitation Failed</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center">
          {state !== "loading" && (
            <Button asChild>
              <Link href="/">Go to Dashboard</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Update middleware to allow invite path**

In `middleware.ts`, add `/invite/:path*` to the matcher:

```typescript
export const config = {
  matcher: [
    "/",
    "/todos/:path*",
    "/timesheet/:path*",
    "/invite/:path*",
  ],
}
```

**Step 3: Commit**

```
feat: add invitation acceptance page with login redirect flow
```

---

## Task 11: Workspace Settings & Member Management UI

**Files:**
- Create: `app/workspace/settings/page.tsx`
- Create: `components/workspace/member-list.tsx`
- Create: `components/workspace/invite-dialog.tsx`
- Modify: `components/layout/sidebar.tsx` — add Settings nav item

**Step 1: Create member list component** (`components/workspace/member-list.tsx`)

Displays all workspace members with role badges, with role change and remove buttons for admin/owner.

**Step 2: Create invite dialog component** (`components/workspace/invite-dialog.tsx`)

A dialog with email input and role select (admin/member). Shows copy-able invite link after creation.

**Step 3: Create workspace settings page** (`app/workspace/settings/page.tsx`)

Layout: AppShell wrapping workspace name edit, member list, pending invitations list, and danger zone (leave/delete workspace).

**Step 4: Add Settings link to sidebar**

Add `{ href: "/workspace/settings", label: "Settings", icon: Settings }` to navItems — conditionally visible based on workspace role (admin/owner only show member management).

**Step 5: Commit**

```
feat: add workspace settings page with member management and invitations
```

---

## Task 12: Comments API

**Files:**
- Create: `lib/api/comments.ts`

**Step 1: Create comment CRUD functions**

```typescript
"use server"

import { db } from "@/lib/db"
import { comments, workspaceMembers, type Comment } from "@/lib/db/schema"
import { eq, and, asc } from "drizzle-orm"
import { requirePermission, getMemberRole } from "@/lib/auth/permissions"

export async function getComments(todoId: string, workspaceId: string): Promise<(Comment & { user_name: string | null; user_email: string })[]> {
  const data = await db.query.comments.findMany({
    where: and(
      eq(comments.todo_id, todoId),
      eq(comments.workspace_id, workspaceId)
    ),
    with: {
      user: true,
    },
    orderBy: [asc(comments.created_at)],
  })

  return data.map((c) => ({
    ...c,
    user_name: c.user?.name ?? null,
    user_email: c.user?.email ?? "Unknown",
  }))
}

export async function createComment(
  workspaceId: string,
  userId: string,
  todoId: string,
  content: string
): Promise<Comment> {
  const role = await getMemberRole(userId, workspaceId)
  if (!role) throw new Error("Not a member of this workspace")

  const [comment] = await db
    .insert(comments)
    .values({
      todo_id: todoId,
      workspace_id: workspaceId,
      user_id: userId,
      content,
      updated_at: new Date(),
    })
    .returning()

  return comment
}

export async function updateComment(
  commentId: string,
  userId: string,
  content: string
): Promise<Comment> {
  const existing = await db.query.comments.findFirst({ where: eq(comments.id, commentId) })
  if (!existing) throw new Error("Comment not found")
  if (existing.user_id !== userId) throw new Error("Cannot edit another user's comment")

  const [updated] = await db
    .update(comments)
    .set({ content, updated_at: new Date() })
    .where(eq(comments.id, commentId))
    .returning()

  return updated
}

export async function deleteComment(
  workspaceId: string,
  userId: string,
  commentId: string
): Promise<void> {
  const existing = await db.query.comments.findFirst({ where: eq(comments.id, commentId) })
  if (!existing) throw new Error("Comment not found")

  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "comment:delete_any")
  }

  await db.delete(comments).where(eq(comments.id, commentId))
}
```

**Step 2: Commit**

```
feat: add comments CRUD API functions
```

---

## Task 13: Comment UI Components

**Files:**
- Create: `components/comments/comment-list.tsx`
- Create: `components/comments/comment-input.tsx`
- Modify: `components/todos/todo-list.tsx` — add todo detail dialog with comments

**Step 1: Create CommentInput component**

A textarea with submit button. Includes @mention autocomplete: typing `@` fetches workspace members and shows a dropdown. Arrow keys navigate, Enter selects.

**Step 2: Create CommentList component**

Displays comments for a todo. Each comment shows user name, relative timestamp (using `date-fns`'s `formatDistanceToNow`), content with highlighted @mentions, and edit/delete buttons for own comments.

**Step 3: Add Todo Detail Dialog to TodoList**

Add a new dialog that opens when clicking a todo's title. Shows:
- Todo title, description, project, status, assignee
- CommentList + CommentInput below

**Step 4: Commit**

```
feat: add comments UI with @mention autocomplete on todo detail view
```

---

## Task 14: Notifications API & Helper

**Files:**
- Create: `lib/api/notifications.ts`
- Create: `lib/api/notification-prefs.ts`

**Step 1: Create notification functions** (`lib/api/notifications.ts`)

```typescript
"use server"

import { db } from "@/lib/db"
import { notifications, notificationPreferences, workspaceMembers } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { sseConnections } from "@/lib/sse/connections"

export async function createNotification(
  workspaceId: string,
  actorId: string,
  type: string,
  entityType: string,
  entityId: string,
  message: string
) {
  // Get all workspace members except the actor
  const members = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspace_id, workspaceId),
  })

  const recipients = members.filter((m) => m.user_id !== actorId)

  // Check preferences for each recipient
  const prefs = await db.query.notificationPreferences.findMany({
    where: eq(notificationPreferences.workspace_id, workspaceId),
  })
  const prefsMap = new Map(prefs.map((p) => [p.user_id, p]))

  const eligibleRecipients = recipients.filter((r) => {
    const pref = prefsMap.get(r.user_id)
    if (!pref) return true
    if (pref.muted) return false
    if (pref.muted_types && (pref.muted_types as string[]).includes(type)) return false
    return true
  })

  if (eligibleRecipients.length === 0) return

  // Batch insert notifications
  const values = eligibleRecipients.map((r) => ({
    workspace_id: workspaceId,
    recipient_id: r.user_id,
    actor_id: actorId,
    type,
    entity_type: entityType,
    entity_id: entityId,
    message,
  }))

  const inserted = await db.insert(notifications).values(values).returning()

  // Push to SSE connections
  for (const notification of inserted) {
    const writer = sseConnections.get(notification.recipient_id)
    if (writer) {
      try {
        writer.write(`data: ${JSON.stringify(notification)}\n\n`)
      } catch {
        // Connection closed, will be cleaned up
      }
    }
  }
}

export async function getNotifications(
  userId: string,
  workspaceId: string,
  options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
) {
  const { unreadOnly = false, limit = 50, offset = 0 } = options

  const conditions = [
    eq(notifications.workspace_id, workspaceId),
    eq(notifications.recipient_id, userId),
  ]

  if (unreadOnly) {
    conditions.push(eq(notifications.is_read, false))
  }

  return db.query.notifications.findMany({
    where: and(...conditions),
    orderBy: [desc(notifications.created_at)],
    limit,
    offset,
    with: {
      actor: true,
    },
  })
}

export async function getUnreadCount(userId: string, workspaceId: string): Promise<number> {
  const result = await db.query.notifications.findMany({
    where: and(
      eq(notifications.workspace_id, workspaceId),
      eq(notifications.recipient_id, userId),
      eq(notifications.is_read, false)
    ),
  })
  return result.length
}

export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ is_read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.recipient_id, userId)))
}

export async function markAllAsRead(userId: string, workspaceId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ is_read: true })
    .where(
      and(
        eq(notifications.workspace_id, workspaceId),
        eq(notifications.recipient_id, userId),
        eq(notifications.is_read, false)
      )
    )
}
```

**Step 2: Create notification preferences functions** (`lib/api/notification-prefs.ts`)

```typescript
"use server"

import { db } from "@/lib/db"
import { notificationPreferences } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export async function getNotificationPreferences(userId: string, workspaceId: string) {
  return db.query.notificationPreferences.findFirst({
    where: and(
      eq(notificationPreferences.user_id, userId),
      eq(notificationPreferences.workspace_id, workspaceId)
    ),
  })
}

export async function updateNotificationPreferences(
  userId: string,
  workspaceId: string,
  data: { muted?: boolean; mutedTypes?: string[] }
) {
  const existing = await getNotificationPreferences(userId, workspaceId)

  if (existing) {
    const [updated] = await db
      .update(notificationPreferences)
      .set({
        ...(data.muted !== undefined && { muted: data.muted }),
        ...(data.mutedTypes !== undefined && { muted_types: data.mutedTypes }),
        updated_at: new Date(),
      })
      .where(eq(notificationPreferences.id, existing.id))
      .returning()
    return updated
  }

  const [created] = await db
    .insert(notificationPreferences)
    .values({
      user_id: userId,
      workspace_id: workspaceId,
      muted: data.muted ?? false,
      muted_types: data.mutedTypes ?? [],
      updated_at: new Date(),
    })
    .returning()
  return created
}
```

**Step 3: Commit**

```
feat: add notification CRUD API with preferences support
```

---

## Task 15: SSE Endpoint & Connection Manager

**Files:**
- Create: `lib/sse/connections.ts`
- Create: `app/api/notifications/stream/route.ts`

**Step 1: Create SSE connection manager** (`lib/sse/connections.ts`)

```typescript
// In-memory store of active SSE connections
// Key: userId, Value: writable stream controller reference
export const sseConnections = new Map<string, { write: (data: string) => void }>()
```

**Step 2: Create SSE Route Handler** (`app/api/notifications/stream/route.ts`)

```typescript
import { getServerSession } from "next-auth"
import { sseConnections } from "@/lib/sse/connections"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await getServerSession()
  const userId = (session?.user as any)?.id

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const writer = {
        write: (data: string) => {
          try {
            controller.enqueue(encoder.encode(data))
          } catch {
            // Stream closed
          }
        },
      }

      sseConnections.set(userId, writer)

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"))
        } catch {
          clearInterval(heartbeat)
        }
      }, 30000)

      // Send initial connection event
      controller.enqueue(encoder.encode("data: {\"type\":\"connected\"}\n\n"))

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        sseConnections.delete(userId)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
```

**Step 3: Commit**

```
feat: add SSE endpoint for real-time notification delivery
```

---

## Task 16: Notification UI Components

**Files:**
- Create: `hooks/use-notifications.ts`
- Create: `components/notifications/notification-bell.tsx`
- Create: `components/notifications/notification-panel.tsx`
- Create: `components/notifications/notification-prefs.tsx`
- Modify: `components/layout/topbar.tsx` — add notification bell

**Step 1: Create useNotifications hook** (`hooks/use-notifications.ts`)

Uses `EventSource` to connect to `/api/notifications/stream`. Manages unread count. Auto-reconnects on disconnect with exponential backoff.

**Step 2: Create NotificationBell** (`components/notifications/notification-bell.tsx`)

Bell icon with unread count badge. Click toggles notification panel.

**Step 3: Create NotificationPanel** (`components/notifications/notification-panel.tsx`)

Dropdown panel with scrollable notification list. Each item shows actor name, message, relative time, read/unread indicator. "Mark all as read" button at top.

**Step 4: Create NotificationPrefs** (`components/notifications/notification-prefs.tsx`)

Modal with mute toggle and per-type checkboxes grouped by category.

**Step 5: Add NotificationBell to Topbar**

Add `<NotificationBell />` in the topbar's right section, between the keyboard shortcuts popover and the theme toggle.

**Step 6: Commit**

```
feat: add notification bell, panel, and preferences UI with SSE real-time updates
```

---

## Task 17: Wire Notifications into Actions

**Files:**
- Modify: `lib/api/todos.ts` — call `createNotification()` after create, update, complete, delete
- Modify: `lib/api/projects.ts` — call `createNotification()` after create, update, delete
- Modify: `lib/api/comments.ts` — call `createNotification()` after create, plus mention notifications
- Modify: `lib/api/members.ts` — call `createNotification()` on member join/remove/role change
- Modify: `lib/api/invitations.ts` — call `createNotification()` on invitation acceptance

**Step 1: Add notification triggers to all API functions**

After each successful mutation, call:
```typescript
await createNotification(workspaceId, userId, "todo_created", "todo", todo.id, `${userName} created "${todo.title}"`)
```

Pattern for each action:
- `createTodo` → `todo_created`
- `updateTodo` → `todo_updated`
- `toggleTodoComplete` → `todo_completed` (when true)
- `deleteTodo` → `todo_deleted`
- `createProject` → `project_created`
- `updateProject` → `project_updated`
- `deleteProject` → `project_deleted`
- `createComment` → `comment_added` + `mention` for @mentioned users
- `acceptInvitation` → `member_joined`
- `removeMember` → `member_removed`
- `updateMemberRole` → `role_changed`

**Step 2: Parse @mentions in comments**

In `createComment`, after inserting the comment, parse the content for `@name` patterns, resolve to user IDs from workspace members, and create `mention` type notifications for each.

**Step 3: Commit**

```
feat: wire notification triggers into all mutating actions
```

---

## Task 18: Registration with Auto-Workspace & Invite Token

**Files:**
- Modify: `app/api/auth/register/route.ts`
- Modify: `app/login/page.tsx` — pass invite token through login flow

**Step 1: Update registration to create default workspace**

After creating the user, if no invite token is provided, create a default workspace. If an invite token is present in the request body, auto-accept it after registration.

```typescript
// After creating user, before returning response:
import { createWorkspace } from "@/lib/api/workspaces"
import { acceptInvitation } from "@/lib/api/invitations"

const inviteToken = body.inviteToken

if (inviteToken) {
  try {
    await acceptInvitation(inviteToken, newUser.id)
  } catch {
    // Invitation failed but user was created — they can still use the app
  }
}
```

**Step 2: Update login page to preserve invite token**

Read `invite` query param and pass it to the post-login redirect so the invite page can handle it.

**Step 3: Commit**

```
feat: handle invite tokens during registration and login flows
```

---

## Task 19: Final Integration Testing & Cleanup

**Step 1: Verify the complete flow manually**

1. Register a new user → verify default workspace is created
2. Create todos, projects, timesheet entries → verify scoped to workspace
3. Create a second workspace → switch between them → verify data isolation
4. Invite another user → register as new user with invite link → verify join
5. Test RBAC: member tries to delete others' todos → verify blocked
6. Post a comment with @mention → verify notification appears for mentioned user
7. Check notification bell updates in real-time (SSE)
8. Mute a notification type → verify it stops appearing

**Step 2: Run build**

Run: `npm run build`

Fix any TypeScript errors.

**Step 3: Commit**

```
feat: multi-tenancy, RBAC, comments, and real-time notifications — complete
```
