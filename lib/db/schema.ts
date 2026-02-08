import { pgTable, uuid, text, timestamp, boolean, date, doublePrecision, integer, uniqueIndex, index, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  name: text("name"),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  todos: many(todos),
  timesheetEntries: many(timesheetEntries),
  ownedWorkspaces: many(workspaces),
  workspaceMemberships: many(workspaceMembers),
  comments: many(comments),
  notifications: many(notifications, { relationName: "recipient" }),
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
  workspace: one(workspaces, {
    fields: [todos.workspace_id],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [todos.project_id],
    references: [projects.id],
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
