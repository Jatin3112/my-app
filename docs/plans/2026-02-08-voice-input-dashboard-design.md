# Voice Input, Dashboard Stats & Home Page Redesign

**Date**: 2026-02-08
**Status**: Approved

## Summary

Three features to be added to the Task Manager app:

1. **Voice input** for creating todos and timesheet entries using the browser's Web Speech Recognition API
2. **Dashboard stats** on the home page showing summary data
3. **Move project management** from the todos page to the home page

---

## Feature 1: Voice Input Component

### What

A reusable `<VoiceInput>` React client component that adds a microphone button next to text input fields. When clicked, it uses the browser's `SpeechRecognition` API to convert speech to text and fills the associated input field.

### Where It Appears

- **Todo create/edit dialog** — next to the "Title" input field
- **Timesheet create/edit dialog** — next to the "Task Description" input field

### Behavior

- A small microphone icon button renders inline next to the input field
- **On click**: starts `SpeechRecognition`, mic icon turns red/pulsing to indicate listening
- **While speaking**: recognized text fills into the input field in real-time (interim results)
- **On silence/stop**: finalizes the text and stops recording
- **Stop button**: appears while recording so the user can manually end it
- **Language**: defaults to `en-US`

### Browser Compatibility

- Uses feature detection: `window.SpeechRecognition || window.webkitSpeechRecognition`
- If the API is not available (Firefox, Safari), the mic button is **not rendered** — no errors, no confusion
- Users on unsupported browsers simply type as usual

### Files to Create/Modify

- **Create**: `components/ui/voice-input.tsx` — reusable VoiceInput component
- **Modify**: `components/todos/todo-list.tsx` — add VoiceInput to title field in create/edit dialog
- **Modify**: `components/timesheet/timesheet-list.tsx` — add VoiceInput to task description field in create/edit dialog

---

## Feature 2: Dashboard Stats

### What

A row of summary stat cards displayed on the home page, giving the user an at-a-glance view of their data.

### Stats Displayed

| Stat | Source | Icon |
|------|--------|------|
| Total Projects | COUNT of projects | FolderOpen |
| Total Todos | COUNT of todos | ListTodo |
| Completed Todos | COUNT where completed=true (with percentage) | CheckCircle |
| Pending Todos | COUNT where completed=false | Circle |
| Total Hours Logged | SUM of timesheet hours | Clock |
| This Week's Hours | SUM of timesheet hours where date is current week | CalendarClock |

### Data Fetching

A new server action `getDashboardStats(user_id)` in `lib/api/dashboard.ts` that runs aggregate queries (COUNT, SUM) in a single database call for efficiency.

### Return Type

```typescript
type DashboardStats = {
  totalProjects: number
  totalTodos: number
  completedTodos: number
  pendingTodos: number
  totalHoursLogged: number
  thisWeekHours: number
}
```

### Files to Create/Modify

- **Create**: `lib/api/dashboard.ts` — server action for aggregate stats query
- **Create**: `components/dashboard/stats-cards.tsx` — stat cards component
- **Modify**: `app/page.tsx` — integrate stats cards

---

## Feature 3: Home Page Redesign & Project Move

### What

Move the `<ProjectManager>` component from the todos page to the home page. Remove it from the todos page entirely.

### Updated Home Page Layout (top to bottom)

1. **Header** — "Task Manager" title, user info, logout button (existing)
2. **Dashboard stat cards** — new summary stats row (Feature 2)
3. **Quick link cards** — existing cards linking to Todos and Timesheet
4. **Project manager** — full CRUD for projects (moved from todos page)

### Todos Page Changes

- Remove `<ProjectManager>` component import and rendering
- Keep the project filter dropdown (read-only, already fetches projects independently via `getProjects()`)
- No other changes needed

### Files to Modify

- **Modify**: `app/page.tsx` — add ProjectManager component and dashboard stats
- **Modify**: `app/todos/page.tsx` — remove ProjectManager component

---

## Implementation Order

1. Create the `VoiceInput` component
2. Integrate `VoiceInput` into todo and timesheet dialogs
3. Create `getDashboardStats` server action
4. Create `StatsCards` dashboard component
5. Redesign home page: add stats cards, move project manager
6. Remove project manager from todos page
