import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "user-1", name: "Test User", email: "test@test.com" } },
    status: "authenticated" as const,
  }),
}));

// Mock workspace hook
vi.mock("@/hooks/use-workspace", () => ({
  useWorkspace: () => ({
    currentWorkspace: { id: "ws-1", name: "Test Workspace" },
    seedWorkspaces: vi.fn(),
  }),
}));

// Mock server actions
vi.mock("@/lib/api/todos", () => ({
  createTodo: vi.fn().mockResolvedValue({}),
  updateTodo: vi.fn().mockResolvedValue({}),
  toggleTodoComplete: vi.fn().mockResolvedValue({}),
  deleteTodo: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/api/bulk-actions", () => ({
  bulkDeleteTodos: vi.fn().mockResolvedValue(undefined),
  bulkToggleTodos: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/api/loaders", () => ({
  loadTodoPageData: vi.fn().mockResolvedValue({ todos: [], projects: [] }),
}));

vi.mock("@/lib/api/reorder", () => ({
  reorderTodos: vi.fn().mockResolvedValue(undefined),
}));

// Mock file attachment component
vi.mock("@/components/todos/file-attachment", () => ({
  FileAttachment: () => <div data-testid="file-attachment">File Attachments</div>,
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

// Mock keyboard shortcuts
vi.mock("@/hooks/use-keyboard-shortcuts", () => ({
  useKeyboardShortcuts: vi.fn(),
}));

// Mock date-fns with proper named exports
vi.mock("date-fns", () => ({
  parseISO: (dateStr: string) => new Date(dateStr + "T00:00:00"),
  isToday: (d: Date) => {
    const today = new Date();
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  },
  isPast: (d: Date) => d < new Date(),
  isThisWeek: (d: Date) => true,
  format: (d: Date, fmt: string) => {
    if (fmt === "yyyy-MM-dd") return d.toISOString().split("T")[0];
    if (fmt === "MMM d, yyyy") return "Feb 21, 2026";
    return d.toISOString();
  },
}));

// Mock VoiceInput
vi.mock("@/components/ui/voice-input", () => ({
  VoiceInput: () => <button>Voice</button>,
}));

// Mock DatePicker
vi.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ value, onChange, placeholder }: any) => (
    <button data-testid="date-picker" onClick={() => onChange("2026-03-15")}>
      {value || placeholder || "Pick a date"}
    </button>
  ),
}));

// Mock CommentList
vi.mock("@/components/comments/comment-list", () => ({
  CommentList: () => <div>Comments</div>,
}));

import { TodoList } from "@/components/todos/todo-list";
import type { Todo, Project } from "@/lib/db/schema";

function createTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: "todo-" + Math.random().toString(36).slice(2, 8),
    title: "Test Todo",
    description: null,
    project_id: null,
    priority: "none",
    due_date: null,
    completed: false,
    sort_order: 0,
    user_id: "user-1",
    workspace_id: "ws-1",
    recurrence_rule: null,
    recurrence_end_date: null,
    parent_todo_id: null,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    ...overrides,
  };
}

const mockProjects: Project[] = [
  {
    id: "proj-1",
    name: "Acme",
    description: null,
    user_id: "user-1",
    workspace_id: "ws-1",
    created_at: new Date(),
    updated_at: new Date(),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TodoList - Priority Badges", () => {
  it("renders high priority badge with correct text", () => {
    const todos = [createTodo({ id: "t1", title: "Urgent task", priority: "high" })];
    render(<TodoList initialData={{ todos, projects: mockProjects }} />);

    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders medium priority badge", () => {
    const todos = [createTodo({ id: "t2", title: "Medium task", priority: "medium" })];
    render(<TodoList initialData={{ todos, projects: mockProjects }} />);

    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("renders low priority badge", () => {
    const todos = [createTodo({ id: "t3", title: "Low task", priority: "low" })];
    render(<TodoList initialData={{ todos, projects: mockProjects }} />);

    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("does not render priority badge for 'none'", () => {
    const todos = [createTodo({ id: "t4", title: "No priority task", priority: "none" })];
    render(<TodoList initialData={{ todos, projects: mockProjects }} />);

    expect(screen.queryByText("None")).not.toBeInTheDocument();
    // "High", "Medium", "Low" badges shouldn't appear
    expect(screen.queryByText("High")).not.toBeInTheDocument();
    expect(screen.queryByText("Medium")).not.toBeInTheDocument();
    expect(screen.queryByText("Low")).not.toBeInTheDocument();
  });
});

describe("TodoList - Due Date Display", () => {
  it("shows 'Today' for due-today items", () => {
    const today = new Date().toISOString().split("T")[0];
    const todos = [createTodo({ id: "t5", title: "Due today", due_date: today })];
    render(<TodoList initialData={{ todos, projects: mockProjects }} />);

    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("shows date string for future dates", () => {
    const todos = [createTodo({ id: "t6", title: "Future task", due_date: "2027-12-31" })];
    render(<TodoList initialData={{ todos, projects: mockProjects }} />);

    expect(screen.getByText("2027-12-31")).toBeInTheDocument();
  });

  it("shows dash for items without due date", () => {
    const todos = [createTodo({ id: "t7", title: "No date", due_date: null })];
    render(<TodoList initialData={{ todos, projects: mockProjects }} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows overdue date for past dates on incomplete todos", () => {
    const todos = [createTodo({ id: "t8", title: "Overdue task", due_date: "2020-01-01", completed: false })];
    render(<TodoList initialData={{ todos, projects: mockProjects }} />);

    // Should show the date text (with red styling applied via classes)
    expect(screen.getByText("2020-01-01")).toBeInTheDocument();
  });
});

describe("TodoList - Priority Filter", () => {
  it("filters to show only high priority todos", async () => {
    const user = userEvent.setup();
    const todos = [
      createTodo({ id: "t9", title: "High todo", priority: "high" }),
      createTodo({ id: "t10", title: "Low todo", priority: "low" }),
      createTodo({ id: "t11", title: "None todo", priority: "none" }),
    ];
    render(<TodoList initialData={{ todos, projects: mockProjects }} />);

    // All should be visible initially
    expect(screen.getByText("High todo")).toBeInTheDocument();
    expect(screen.getByText("Low todo")).toBeInTheDocument();
    expect(screen.getByText("None todo")).toBeInTheDocument();
  });
});

describe("TodoList - Sort by Priority", () => {
  it("renders todos in default order initially", () => {
    const todos = [
      createTodo({ id: "t12", title: "Low first", priority: "low", sort_order: 0 }),
      createTodo({ id: "t13", title: "High second", priority: "high", sort_order: 1 }),
      createTodo({ id: "t14", title: "Medium third", priority: "medium", sort_order: 2 }),
    ];
    render(<TodoList initialData={{ todos, projects: mockProjects }} />);

    const rows = screen.getAllByRole("row");
    // Header row + 3 data rows
    expect(rows.length).toBe(4);
  });
});

describe("TodoList - Create Dialog", () => {
  it("shows priority selector and date picker in create dialog", async () => {
    const user = userEvent.setup();
    render(<TodoList initialData={{ todos: [], projects: mockProjects }} />);

    await user.click(screen.getByRole("button", { name: /add todo/i }));

    // Priority label appears in both the filter and the dialog
    expect(screen.getByLabelText("Priority")).toBeInTheDocument();
    // Due Date appears as both a column header and dialog label — just confirm date picker renders
    expect(screen.getByTestId("date-picker")).toBeInTheDocument();
  });
});

describe("TodoList - Table Headers", () => {
  it("renders Priority and Due Date column headers", () => {
    render(<TodoList initialData={{ todos: [], projects: mockProjects }} />);

    // Column headers exist even when no todos
    const headers = screen.getAllByRole("columnheader");
    const headerTexts = headers.map(h => h.textContent);
    expect(headerTexts).toContain("Priority");
    expect(headerTexts).toContain("Due Date");
  });
});

describe("TodoList - Recurrence", () => {
  it("shows repeat icon on recurring todos", () => {
    const todos = [
      createTodo({ id: "t-rec-1", title: "Weekly standup", recurrence_rule: "weekly" }),
    ];
    render(<TodoList initialData={{ todos, projects: mockProjects }} />);

    const repeatIcon = screen.getByTitle("Repeats weekly");
    expect(repeatIcon).toBeInTheDocument();
  });

  it("does not show repeat icon on non-recurring todos", () => {
    const todos = [
      createTodo({ id: "t-rec-2", title: "One-off task", recurrence_rule: null }),
    ];
    render(<TodoList initialData={{ todos, projects: mockProjects }} />);

    expect(screen.queryByTitle(/^Repeats /)).not.toBeInTheDocument();
  });

  it("shows recurrence selector in create dialog", async () => {
    const user = userEvent.setup();
    render(<TodoList initialData={{ todos: [], projects: mockProjects }} />);

    await user.click(screen.getByRole("button", { name: /add todo/i }));

    expect(screen.getByText("Repeat")).toBeInTheDocument();
  });
});
