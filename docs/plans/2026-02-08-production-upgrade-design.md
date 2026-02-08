# Production Upgrade: Navigation, Bulk Actions, Search, Polish & Interactivity

**Date**: 2026-02-08
**Status**: Approved

## Summary

Full production upgrade covering 6 areas:

1. Navigation & layout shell with sidebar, topbar, and dark mode
2. Bulk actions for multi-select delete/complete
3. Search & filters for todos and timesheet
4. Loading states, optimistic updates, and undo toasts
5. Drag-and-drop todo reordering
6. Keyboard shortcuts

---

## Feature 1: Navigation & Layout Shell

### What

A persistent layout shell wrapping all authenticated pages with a collapsible sidebar and top bar.

### Components

**AppShell** (`components/layout/app-shell.tsx`):
- Wraps all authenticated page content
- Contains Sidebar and Topbar

**Sidebar** (`components/layout/sidebar.tsx`):
- Nav links: Home (dashboard icon), Todos (check-square icon), Timesheet (clock icon)
- Active route highlighted
- Collapsible on desktop (icon-only mode)
- On mobile: hidden by default, opens as a sheet/drawer via hamburger button in topbar

**Topbar** (`components/layout/topbar.tsx`):
- Left: hamburger menu (mobile only) + app name
- Right: dark mode toggle, keyboard shortcut help (?), user name/avatar, logout button

**Dark Mode**:
- `next-themes` library for theme management
- `ThemeProvider` wrapping the app in `app/layout.tsx`
- `ThemeToggle` component (sun/moon icon button) in the topbar
- Works with existing Tailwind dark: classes

### Page Changes

- Remove all "Back to Home" buttons and per-page headers from `/todos`, `/timesheet`
- Remove the header/user info/logout section from `app/page.tsx` (topbar handles this)
- All authenticated pages render their content inside the shell

### Files

- **Create**: `components/layout/app-shell.tsx`
- **Create**: `components/layout/sidebar.tsx`
- **Create**: `components/layout/topbar.tsx`
- **Create**: `components/theme-provider.tsx`
- **Create**: `components/theme-toggle.tsx`
- **Modify**: `app/layout.tsx` — wrap with ThemeProvider
- **Modify**: `app/page.tsx` — remove header, use shell
- **Modify**: `app/todos/page.tsx` — remove back button, use shell
- **Modify**: `app/timesheet/page.tsx` — remove back button, use shell
- **Install**: `next-themes`

---

## Feature 2: Bulk Actions

### What

Multi-select items in todos and timesheet tables to perform batch delete or complete operations.

### UI Behavior

- Checkbox column as the first column in both tables
- "Select All" checkbox in the table header (selects visible/filtered items)
- When 1+ items selected, a floating action bar appears at the bottom of the screen:
  - "X items selected" count
  - **Delete Selected** button (with confirmation dialog)
  - **Mark Complete** / **Mark Incomplete** buttons (todos only)
  - **Clear selection** button
- Selection clears after any bulk action completes
- Existing row-level edit/delete buttons remain functional

### Server Actions

`lib/api/bulk-actions.ts`:

```typescript
bulkDeleteTodos(ids: string[]): Promise<void>
// DELETE FROM todos WHERE id IN (...)

bulkToggleTodos(ids: string[], completed: boolean): Promise<void>
// UPDATE todos SET completed = $1 WHERE id IN (...)

bulkDeleteTimesheetEntries(ids: string[]): Promise<void>
// DELETE FROM timesheet_entries WHERE id IN (...)
```

Uses `inArray()` from drizzle-orm for efficient queries.

### Files

- **Create**: `lib/api/bulk-actions.ts`
- **Modify**: `components/todos/todo-list.tsx` — checkbox column, selection state, floating bar
- **Modify**: `components/timesheet/timesheet-list.tsx` — checkbox column, selection state, floating bar

---

## Feature 3: Search & Filters

### Todos Page

- **Search input**: filters todos by title, client-side, real-time
- **Project filter**: existing dropdown, unchanged
- **Status filter**: button group toggle — All | Completed | Pending
- All three filters stack (search + project + status applied together)

### Timesheet Page

- **Date range picker**: two date inputs (From / To), server-side filtering via existing `startDate`/`endDate` params in `getTimesheetEntries`
- **Project filter dropdown**: client-side filter by project name
- **Search input**: filters by task description, client-side
- **Default view**: current month's entries instead of all entries

### Implementation

- Todos: all filtering client-side (dataset is small)
- Timesheet: date range is server-side (re-fetches on change), project + text search are client-side on fetched results
- Filter state in component state, no URL params

### Files

- **Modify**: `components/todos/todo-list.tsx` — add search input, status filter toggle
- **Modify**: `components/timesheet/timesheet-list.tsx` — add date range, project filter, search input

---

## Feature 4: Loading States & Optimistic Updates

### Skeleton Loaders

- On initial data load, show skeleton rows matching the table layout (grey pulsing bars)
- Use existing `animate-pulse` Tailwind class
- `isInitialLoading` boolean — skeletons only on first load, not on mutation refetches

### Optimistic Updates

- **Toggle todo complete**: immediately flip status in state, sync with server, revert on failure
- **Delete (single)**: immediately remove from list, show undo toast. Server delete fires after 5s if no undo
- **Bulk complete**: immediately update all selected items visually

### Undo Toasts (replacing AlertDialog for single deletes)

- Single delete: no confirmation dialog. Item removed from UI immediately, toast with "Undo" button shown for 5 seconds. If not undone, server delete executes
- Bulk deletes: still show confirmation dialog (higher stakes, multiple items)
- Uses `sonner` toast library (already installed) with action button support

### Files

- **Modify**: `components/todos/todo-list.tsx` — skeleton state, optimistic toggle, undo delete
- **Modify**: `components/timesheet/timesheet-list.tsx` — skeleton state, undo delete

---

## Feature 5: Drag-and-Drop Todo Reordering

### What

Users can drag todos to reorder them by priority. Order persists across sessions.

### Library

`@dnd-kit/core` + `@dnd-kit/sortable` — lightweight, accessible, React-first, supports touch.

### UI

- Drag handle (grip/dots icon) as the first visual element in each todo row (before checkbox)
- Smooth animation on drag with visual feedback
- Reorder saves immediately on drop

### Database Change

Add `sort_order` column to `todos` table:

```typescript
sort_order: integer("sort_order").default(0).notNull()
```

Requires a new drizzle migration.

### Server Actions

`lib/api/reorder.ts`:

```typescript
reorderTodos(orderedIds: string[]): Promise<void>
// Updates sort_order for each todo based on array position
```

### Query Change

`getTodos` updated to `ORDER BY sort_order ASC`.

### Behavior

- New todos get `sort_order = max + 1` (appear at bottom)
- Drag works within current filtered view
- Touch-compatible for mobile

### Files

- **Migrate**: new drizzle migration for `sort_order` column
- **Modify**: `lib/db/schema.ts` — add `sort_order` to todos
- **Create**: `lib/api/reorder.ts` — reorder server action
- **Modify**: `lib/api/todos.ts` — set sort_order on create, order by it on fetch
- **Modify**: `components/todos/todo-list.tsx` — integrate dnd-kit sortable
- **Install**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

---

## Feature 6: Keyboard Shortcuts

### Global Shortcuts (any page)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Focus search input on current page |
| `N` | Open "New" dialog (todo or timesheet entry) |
| `Escape` | Close dialog / clear selection / clear search |

### Contextual Shortcuts (table focused, not typing)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + A` | Select all visible items |
| `Delete` / `Backspace` | Delete selected items |

### Implementation

- `useKeyboardShortcuts` custom hook with event listener registration/cleanup
- Each page passes its own action handlers
- Shortcuts disabled when user is typing in `input`, `textarea`, or `[contenteditable]` (except `Escape` and `Ctrl+` combos)
- `?` button in topbar opens a small popover showing the shortcut cheat sheet

### Files

- **Create**: `hooks/use-keyboard-shortcuts.ts`
- **Modify**: `components/todos/todo-list.tsx` — wire up shortcuts
- **Modify**: `components/timesheet/timesheet-list.tsx` — wire up shortcuts
- **Modify**: `components/layout/topbar.tsx` — shortcut help tooltip

---

## New Dependencies

| Package | Purpose |
|---------|---------|
| `next-themes` | Dark mode theme management |
| `@dnd-kit/core` | Drag-and-drop core |
| `@dnd-kit/sortable` | Sortable list primitives |
| `@dnd-kit/utilities` | CSS utilities for dnd-kit |

---

## Implementation Order

1. Install new dependencies
2. Create layout shell (sidebar, topbar, dark mode) — foundation for everything else
3. Update all pages to use the shell
4. Add search & filters to todos and timesheet
5. Add bulk actions (checkbox selection, floating bar, server actions)
6. Add skeleton loaders and optimistic updates
7. Replace single-delete alert dialogs with undo toasts
8. Add `sort_order` column + migration, update todo queries
9. Add drag-and-drop reordering to todos
10. Add keyboard shortcuts hook and wire up to all pages
