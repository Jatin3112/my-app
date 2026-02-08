# Multi-tenancy, RBAC & In-App Notifications

**Date**: 2026-02-08
**Status**: Approved

## Summary

SaaS foundation covering 3 interconnected areas:

1. Multi-tenancy with workspaces — users can create/join multiple workspaces, all data scoped by workspace
2. Role-Based Access Control (RBAC) — Owner, Admin, Member roles with permission matrix
3. In-app notifications with SSE — full activity feed, real-time delivery, mute/filter controls
4. Comments & @mentions on todos — collaboration primitive that drives notifications

---

## Feature 1: Multi-tenancy (Workspaces)

### Data Model

**`workspaces` table**:
- `id` (UUID, primary key)
- `name` (text, not null) — display name e.g. "Acme Corp"
- `slug` (text, unique, not null) — URL-friendly identifier e.g. "acme-corp"
- `owner_id` (UUID, FK to users, not null) — the user who created the workspace
- `created_at` (timestamp, default now)
- `updated_at` (timestamp, default now)

**`workspace_members` table** (join table):
- `id` (UUID, primary key)
- `workspace_id` (UUID, FK to workspaces, cascade delete)
- `user_id` (UUID, FK to users, cascade delete)
- `role` (text, not null) — enum: `owner` | `admin` | `member`
- `joined_at` (timestamp, default now)
- Unique constraint on `(workspace_id, user_id)` — one membership per workspace

**`workspace_invitations` table**:
- `id` (UUID, primary key)
- `workspace_id` (UUID, FK to workspaces, cascade delete)
- `email` (text, not null) — the invitee's email
- `role` (text, not null) — the role they'll receive on acceptance
- `invited_by` (UUID, FK to users, not null)
- `token` (text, unique, not null) — unique token for invite link
- `status` (text, not null, default `pending`) — enum: `pending` | `accepted` | `expired`
- `expires_at` (timestamp, not null) — 7 days from creation
- `created_at` (timestamp, default now)

### Changes to Existing Tables

All existing data tables gain a `workspace_id` column:

- `todos` — add `workspace_id` (UUID, FK to workspaces, cascade delete, not null)
- `projects` — add `workspace_id` (UUID, FK to workspaces, cascade delete, not null)
- `timesheet_entries` — add `workspace_id` (UUID, FK to workspaces, cascade delete, not null)

Every query in the API layer gets scoped by `workspace_id` in addition to `user_id`. The `user_id` on todos now serves as the **assignee** (who is responsible), while `workspace_id` determines **visibility** (who can see it).

### Invitation Flow

1. Admin/Owner opens "Manage Members" in workspace settings → clicks "Invite" → enters email + selects role
2. Server creates a row in `workspace_invitations` with a unique `token` and `expires_at` (7 days from now)
3. Email is sent (or for MVP, the invite link is displayed/copied) with link: `app.com/invite/{token}`
4. Recipient clicks the link:
   - **Already has an account** → logs in if needed → auto-joins the workspace with assigned role
   - **No account** → redirected to register page with invite token preserved in query param → after signup, auto-joins
5. Invitation status flips to `accepted`, a `member_joined` notification is broadcast to the workspace

### Edge Cases

- Duplicate invite to same email for same workspace → reject with "already invited"
- Inviting an existing member → reject with "already a member"
- Expired token → show "invitation expired, ask your admin for a new invite"
- Owner tries to leave → blocked, must transfer ownership first
- Workspace deleted → cascade deletes all members, invitations, todos, projects, timesheet entries

### First-Time Experience

- New user signs up → a default workspace is auto-created named "{User's name}'s Workspace" with role `owner`
- User lands directly in their workspace — no empty state confusion
- They can later create additional workspaces or accept invitations to join others

### Workspace Switching UI

- Sidebar gets a **workspace selector dropdown** at the top (above navigation links)
- Shows current workspace name + user's role as a small badge
- Dropdown lists all workspaces the user belongs to
- "Create Workspace" option at the bottom of the dropdown
- Last-used workspace ID stored in `localStorage` for quick resume on next visit
- URL structure stays clean — no workspace slug in URLs. Workspace context comes from client state (localStorage + React context)

### API Functions

- `createWorkspace(userId, { name })` — creates workspace, auto-generates slug, adds user as owner
- `getWorkspacesForUser(userId)` — returns all workspaces the user is a member of with their role
- `getWorkspaceMembers(workspaceId)` — returns all members with roles
- `updateWorkspace(workspaceId, { name })` — update workspace details
- `deleteWorkspace(workspaceId)` — delete workspace (owner only, cascade)
- `inviteMember(workspaceId, { email, role, invitedBy })` — create invitation
- `acceptInvitation(token, userId)` — accept invite, create membership
- `removeMember(workspaceId, userId)` — remove a member (admin/owner only, cannot remove owner)
- `updateMemberRole(workspaceId, userId, newRole)` — change a member's role (admin/owner only)
- `transferOwnership(workspaceId, currentOwnerId, newOwnerId)` — transfer owner role
- `leaveWorkspace(workspaceId, userId)` — member leaves voluntarily (blocked if owner)

---

## Feature 2: Role-Based Access Control (RBAC)

### Roles

| Role | Description |
|------|-------------|
| **Owner** | Full control. Created the workspace or had ownership transferred. One per workspace. |
| **Admin** | Can manage members, invitations, and all content. Cannot delete workspace or manage billing. |
| **Member** | Can create and manage their own content. Can view all workspace content. |

### Permission Matrix

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| Delete workspace | Yes | No | No |
| Manage billing (future) | Yes | No | No |
| Invite members | Yes | Yes | No |
| Remove members | Yes | Yes | No |
| Change member roles | Yes | Yes (cannot change owner) | No |
| Transfer ownership | Yes | No | No |
| Create/edit projects | Yes | Yes | Yes |
| Delete projects | Yes | Yes | Own only |
| Create todos | Yes | Yes | Yes |
| Edit/delete any todo | Yes | Yes | No |
| Edit/delete own todos | Yes | Yes | Yes |
| Assign todos to members | Yes | Yes | Yes |
| View all todos | Yes | Yes | Yes |
| Create timesheet entries | Yes | Yes | Yes |
| View all timesheet entries | Yes | Yes | No |
| View own timesheet entries | Yes | Yes | Yes |
| Edit/delete own timesheet | Yes | Yes | Yes |
| Edit/delete any timesheet | Yes | Yes | No |
| Manage notification prefs | Yes | Yes | Yes |

### Implementation

**Server-side enforcement:**
- A `checkPermission(userId, workspaceId, action)` utility function
- Called at the start of every API function before any DB operation
- Returns `{ allowed: boolean, role: string }` or throws an error
- Permission checks are centralized in a `lib/auth/permissions.ts` file
- The permissions map is a single object — easy to extend when adding new roles or actions

**Client-side UI adaptation:**
- Workspace context provides the current user's role
- UI components conditionally render action buttons based on role
- "Invite Member" button hidden for members
- "Delete" buttons on others' content hidden for members
- "Workspace Settings" / "Manage Members" hidden for members
- Role badge shown next to each member's name in the members list

---

## Feature 3: In-App Notifications

### Data Model

**`notifications` table**:
- `id` (UUID, primary key)
- `workspace_id` (UUID, FK to workspaces, cascade delete)
- `recipient_id` (UUID, FK to users, cascade delete) — who receives this notification
- `actor_id` (UUID, FK to users, set null on delete) — who performed the action
- `type` (text, not null) — enum of notification types (see below)
- `entity_type` (text, not null) — enum: `todo` | `project` | `workspace` | `comment`
- `entity_id` (UUID) — the ID of the thing that was acted on
- `message` (text, not null) — human-readable string e.g. "Jatin completed 'Fix login bug'"
- `is_read` (boolean, default false)
- `created_at` (timestamp, default now)

**Notification types:**
- `todo_created` — a new todo was created in the workspace
- `todo_completed` — a todo was marked as complete
- `todo_updated` — a todo was edited (title, description, project, etc.)
- `todo_deleted` — a todo was deleted
- `todo_assigned` — a todo was assigned to someone
- `comment_added` — a comment was posted on a todo
- `mention` — you were @mentioned in a comment
- `project_created` — a new project was created
- `project_updated` — a project was updated
- `project_deleted` — a project was deleted
- `member_joined` — a new member joined the workspace
- `member_removed` — a member was removed from the workspace
- `role_changed` — a member's role was changed

**`notification_preferences` table**:
- `id` (UUID, primary key)
- `user_id` (UUID, FK to users, cascade delete)
- `workspace_id` (UUID, FK to workspaces, cascade delete)
- `muted_types` (JSON) — array of notification types to suppress e.g. `["todo_updated", "project_updated"]`
- `muted` (boolean, default false) — mute entire workspace
- `created_at` (timestamp, default now)
- `updated_at` (timestamp, default now)
- Unique constraint on `(user_id, workspace_id)`

### Notification Creation Logic

Every mutating action (create, update, delete, assign, comment) calls a `createNotification()` helper after the successful DB write:

1. Determine notification `type`, `entity_type`, `entity_id`, and build `message` string
2. Fetch all workspace members except the actor (you don't notify yourself)
3. For each potential recipient, check `notification_preferences`:
   - If `muted` is true for this workspace → skip
   - If `muted_types` includes this notification type → skip
4. Batch insert notification rows for all eligible recipients
5. Push event to SSE connections for recipients who are currently online

### SSE Real-Time Delivery

**Endpoint:** `GET /api/notifications/stream`

**Server-side:**
- Next.js Route Handler returning a `ReadableStream` with `text/event-stream` content type
- Server maintains an in-memory `Map<string, WritableStreamDefaultWriter>` keyed by `userId`
- When a notification is created, the helper looks up active connections and writes the event
- Event format: `data: {"id":"...","type":"todo_assigned","message":"Jatin assigned you 'Deploy v2'","created_at":"..."}\n\n`
- Connection includes heartbeat ping every 30 seconds to keep alive
- On disconnect, the stream is cleaned up from the Map

**Client-side:**
- `useNotifications()` hook using `EventSource` API
- Connects on workspace load, auto-reconnects on disconnect (with exponential backoff)
- Updates notification state in React context
- Increments unread badge count on new events

**Scaling note:** In-memory connection map works for a single server instance. When scaling to multiple servers, swap for Redis pub/sub. Not needed for MVP.

### API Functions

- `getNotifications(userId, workspaceId, { unreadOnly?, limit?, offset? })` — paginated notification feed
- `markAsRead(notificationId, userId)` — mark a single notification as read
- `markAllAsRead(userId, workspaceId)` — mark all notifications as read in a workspace
- `getNotificationPreferences(userId, workspaceId)` — get mute/filter settings
- `updateNotificationPreferences(userId, workspaceId, { muted?, mutedTypes? })` — update preferences
- `deleteOldNotifications(workspaceId, olderThan)` — cleanup job for notifications older than 30 days

### Notification UI

**Bell icon in topbar:**
- Positioned in the topbar, right side, near user info
- Shows unread count as a red badge (number if < 100, "99+" otherwise)
- Click opens a dropdown panel (not a full page)

**Notification panel:**
- Scrollable list of notifications, newest first
- Each notification shows: actor avatar, message text, relative timestamp ("2m ago")
- Unread notifications have a subtle highlight/dot indicator
- Clicking a notification → marks as read + navigates to the relevant entity (todo detail, project, etc.)
- "Mark all as read" button at the top
- "Notification Settings" link at the bottom → opens preferences modal

**Preferences modal:**
- Toggle: "Mute all notifications from this workspace"
- Checklist of notification types with toggles to mute/unmute each
- Grouped by category: Todos, Projects, Team, Comments

---

## Feature 4: Comments & @Mentions

### Data Model

**`comments` table**:
- `id` (UUID, primary key)
- `todo_id` (UUID, FK to todos, cascade delete)
- `workspace_id` (UUID, FK to workspaces, cascade delete)
- `user_id` (UUID, FK to users, set null on delete) — comment author
- `content` (text, not null) — the comment body
- `created_at` (timestamp, default now)
- `updated_at` (timestamp, default now)

### @Mentions

- Comments support `@name` syntax in the content text
- On save, server parses mentions using regex (`/@(\w+)/g`), resolves display names to user IDs within the workspace
- Creates `mention` type notifications for each mentioned user (in addition to the `comment_added` notification for other members)
- Frontend renders mentions as highlighted, styled spans

### Comment UI

- Todo gets a detail/expanded view (dialog or slide-over panel)
- Comments section at the bottom of the todo detail view
- Comment input textarea with @mention autocomplete:
  - Typing `@` triggers a dropdown of workspace members
  - Arrow keys to navigate, Enter to select
  - Selected mention rendered as a styled chip in the input
- Each comment displays: author name, avatar, relative timestamp, content with highlighted mentions
- Edit/delete own comments (admin/owner can delete any)

### API Functions

- `getComments(todoId, workspaceId)` — all comments for a todo, ordered by created_at asc
- `createComment(todoId, workspaceId, userId, { content })` — create comment, parse mentions, create notifications
- `updateComment(commentId, userId, { content })` — edit own comment
- `deleteComment(commentId, userId, workspaceId)` — delete comment (own or admin/owner)

---

## Migration Strategy

### Database Migration

Single Drizzle migration that:
1. Creates `workspaces`, `workspace_members`, `workspace_invitations`, `notifications`, `notification_preferences`, `comments` tables
2. Adds `workspace_id` column to `todos`, `projects`, `timesheet_entries`
3. Runs a data migration:
   - For each existing user, create a default workspace named "{name}'s Workspace"
   - Add the user as `owner` in `workspace_members`
   - Set `workspace_id` on all their existing todos, projects, and timesheet entries
4. Add NOT NULL constraint to `workspace_id` columns after data migration
5. Add foreign key constraints and indexes

### API Layer Migration

- Every API function signature changes to include `workspaceId` parameter
- Every query adds `.where(eq(table.workspaceId, workspaceId))` scope
- Permission checks added at the top of each function
- Existing functionality preserved — just scoped to workspace context

### UI Migration

- Add workspace context provider wrapping authenticated pages
- Sidebar gets workspace selector
- Topbar gets notification bell
- Todo list gets assignee column and comment count
- All data fetching passes `workspaceId` from context

---

## New File Structure

```
lib/
  auth/
    permissions.ts          — permission checking utility
  api/
    workspaces.ts           — workspace CRUD
    invitations.ts          — invitation management
    members.ts              — member management
    notifications.ts        — notification CRUD
    comments.ts             — comment CRUD
    notification-prefs.ts   — notification preferences

app/
  api/
    notifications/
      stream/route.ts       — SSE endpoint
  invite/
    [token]/page.tsx        — invitation acceptance page
  workspace/
    settings/page.tsx       — workspace settings (members, roles)

components/
  workspace/
    workspace-switcher.tsx  — dropdown workspace selector
    workspace-settings.tsx  — settings panel
    member-list.tsx         — member management UI
    invite-dialog.tsx       — invitation form
  notifications/
    notification-bell.tsx   — topbar bell icon with badge
    notification-panel.tsx  — dropdown notification feed
    notification-prefs.tsx  — preferences modal
  comments/
    comment-list.tsx        — comment thread on todo detail
    comment-input.tsx       — textarea with @mention autocomplete
    mention-autocomplete.tsx — @mention dropdown

hooks/
  use-workspace.ts          — workspace context hook
  use-notifications.ts      — SSE connection + notification state
```

---

## Implementation Order

1. **Database migration** — new tables + workspace_id on existing tables + data migration
2. **Workspace CRUD + API** — create, list, switch workspaces
3. **Workspace UI** — switcher in sidebar, create workspace flow, first-time auto-creation
4. **RBAC** — permissions utility, enforce on all existing API functions
5. **Member management** — invite, accept, remove, change role
6. **Member UI** — workspace settings page, member list, invite dialog
7. **Migrate existing features** — scope todos, projects, timesheet by workspace_id, add assignee support
8. **Comments** — data model, API, comment UI on todo detail view
9. **Notifications data layer** — table, creation helper, API functions
10. **SSE endpoint** — real-time stream setup
11. **Notification UI** — bell icon, panel, preferences
12. **@Mentions** — parsing, autocomplete, notification integration
