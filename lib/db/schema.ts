import { pgTable, uuid, text, timestamp, boolean, date, doublePrecision, integer, bigint, uniqueIndex, index, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password"),
  name: text("name"),
  email_verified: timestamp("email_verified"),
  image: text("image"),
  onboarding: json("onboarding").$type<{
    created_project?: boolean
    added_todo?: boolean
    tried_voice?: boolean
    invited_member?: boolean
    dismissed?: boolean
  }>().default({}),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index("projects_workspace_id_idx").on(table.workspace_id),
}));

export const todos = pgTable("todos", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  project_id: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  completed: boolean("completed").default(false).notNull(),
  sort_order: integer("sort_order").default(0).notNull(),
  priority: text("priority").default("none").notNull(),
  due_date: text("due_date"),
  recurrence_rule: text("recurrence_rule"),
  recurrence_end_date: text("recurrence_end_date"),
  parent_todo_id: uuid("parent_todo_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index("todos_workspace_id_idx").on(table.workspace_id),
  projectIdx: index("todos_project_id_idx").on(table.project_id),
}));

export const timesheetEntries = pgTable("timesheet_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  project_name: text("project_name").notNull(),
  task_description: text("task_description").notNull(),
  hours: doublePrecision("hours").notNull(),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index("timesheet_entries_workspace_id_idx").on(table.workspace_id),
  userWorkspaceIdx: index("timesheet_entries_user_workspace_idx").on(table.user_id, table.workspace_id),
}));

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  owner_id: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  stripe_customer_id: text("stripe_customer_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull(),
  joined_at: timestamp("joined_at").defaultNow().notNull(),
}, (table) => ({
  workspaceUserIdx: uniqueIndex("workspace_members_workspace_id_user_id_idx").on(table.workspace_id, table.user_id),
}));

export const workspaceInvitations = pgTable("workspace_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  invited_by: uuid("invited_by").references(() => users.id).notNull(),
  token: text("token").unique().notNull(),
  status: text("status").notNull().default("pending"),
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
}, (table) => ({
  todoIdx: index("comments_todo_id_idx").on(table.todo_id),
}));

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  recipient_id: uuid("recipient_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  actor_id: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  entity_type: text("entity_type").notNull(),
  entity_id: uuid("entity_id"),
  message: text("message").notNull(),
  is_read: boolean("is_read").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  recipientWorkspaceIdx: index("notifications_recipient_workspace_idx").on(table.recipient_id, table.workspace_id),
  recipientUnreadIdx: index("notifications_recipient_unread_idx").on(table.recipient_id, table.is_read),
}));

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  muted_types: json("muted_types").$type<string[]>().default([]),
  muted: boolean("muted").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userWorkspaceIdx: uniqueIndex("notification_preferences_user_id_workspace_id_idx").on(table.user_id, table.workspace_id),
}));

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  price_inr: integer("price_inr").notNull(),
  price_usd: integer("price_usd").notNull(),
  max_users: integer("max_users").notNull(),
  max_projects: integer("max_projects").notNull(),
  max_workspaces: integer("max_workspaces").notNull(),
  max_storage_mb: integer("max_storage_mb").notNull().default(100),
  features: json("features").$type<string[]>().default([]),
  is_active: boolean("is_active").default(true).notNull(),
  razorpay_plan_id: text("razorpay_plan_id"),
  stripe_price_id: text("stripe_price_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  plan_id: uuid("plan_id").references(() => plans.id).notNull(),
  status: text("status").notNull().default("trialing"),
  trial_start: timestamp("trial_start"),
  trial_end: timestamp("trial_end"),
  current_period_start: timestamp("current_period_start"),
  current_period_end: timestamp("current_period_end"),
  payment_provider: text("payment_provider"),
  provider_subscription_id: text("provider_subscription_id"),
  cancel_at_period_end: boolean("cancel_at_period_end").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index("subscriptions_workspace_id_idx").on(table.workspace_id),
}));

export const paymentHistory = pgTable("payment_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  subscription_id: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  provider: text("provider").notNull(),
  provider_payment_id: text("provider_payment_id"),
  status: text("status").notNull().default("pending"),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index("payment_history_workspace_id_idx").on(table.workspace_id),
}));

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  provider: text("provider").notNull(),
  provider_account_id: text("provider_account_id").notNull(),
  access_token: text("access_token"),
  refresh_token: text("refresh_token"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  expires_at: integer("expires_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  providerAccountIdx: uniqueIndex("accounts_provider_provider_account_id_idx").on(table.provider, table.provider_account_id),
  userIdx: index("accounts_user_id_idx").on(table.user_id),
}));

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token_hash: text("token_hash").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  used_at: timestamp("used_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token_hash: text("token_hash").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  used_at: timestamp("used_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const attachments = pgTable("attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  todo_id: uuid("todo_id").references(() => todos.id, { onDelete: "cascade" }).notNull(),
  user_id: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  workspace_id: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }).notNull(),
  file_name: text("file_name").notNull(),
  file_key: text("file_key").notNull(),
  file_size: bigint("file_size", { mode: "number" }).notNull(),
  mime_type: text("mime_type").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  todoIdx: index("attachments_todo_id_idx").on(table.todo_id),
  workspaceIdx: index("attachments_workspace_id_idx").on(table.workspace_id),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  todos: many(todos),
  timesheetEntries: many(timesheetEntries),
  ownedWorkspaces: many(workspaces),
  workspaceMemberships: many(workspaceMembers),
  comments: many(comments),
  notifications: many(notifications, { relationName: "recipient" }),
  accounts: many(accounts),
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
  subscriptions: many(subscriptions),
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
  workspace: one(workspaces, {
    fields: [todos.workspace_id],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [todos.project_id],
    references: [projects.id],
  }),
  comments: many(comments),
  attachments: many(attachments),
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
    relationName: "recipient",
  }),
  actor: one(users, {
    fields: [notifications.actor_id],
    references: [users.id],
    relationName: "actor",
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

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [subscriptions.workspace_id],
    references: [workspaces.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.plan_id],
    references: [plans.id],
  }),
}));

export const paymentHistoryRelations = relations(paymentHistory, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [paymentHistory.workspace_id],
    references: [workspaces.id],
  }),
  subscription: one(subscriptions, {
    fields: [paymentHistory.subscription_id],
    references: [subscriptions.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.user_id],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.user_id],
    references: [users.id],
  }),
}));

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.user_id],
    references: [users.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  todo: one(todos, {
    fields: [attachments.todo_id],
    references: [todos.id],
  }),
  user: one(users, {
    fields: [attachments.user_id],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [attachments.workspace_id],
    references: [workspaces.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

export type TimesheetEntry = typeof timesheetEntries.$inferSelect;
export type NewTimesheetEntry = typeof timesheetEntries.$inferInsert;

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

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type PaymentRecord = typeof paymentHistory.$inferSelect;
export type NewPaymentRecord = typeof paymentHistory.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
