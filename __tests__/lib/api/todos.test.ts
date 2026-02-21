import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db — vi.mock is hoisted, so we can't reference external variables in the factory
vi.mock("@/lib/db", () => {
  const mockDb = {
    query: {
      todos: { findFirst: vi.fn(), findMany: vi.fn() },
      users: { findFirst: vi.fn().mockResolvedValue({ id: "user-1", name: "Test", email: "t@t.com" }) },
    },
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
  };
  return { db: mockDb };
});

vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: vi.fn().mockResolvedValue(undefined),
  getMemberRole: vi.fn().mockResolvedValue("owner"),
}));

vi.mock("@/lib/cache", () => ({
  cached: vi.fn((_key: string, _ttl: number, fetcher: () => Promise<unknown>) => fetcher()),
  cacheDel: vi.fn(),
}));

vi.mock("@/lib/api/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

import { createTodo, updateTodo, getTodos } from "@/lib/api/todos";
import { db } from "@/lib/db";

beforeEach(() => {
  vi.clearAllMocks();
  // Re-setup user mock after clearAllMocks
  (db.query.users.findFirst as any).mockResolvedValue({ id: "user-1", name: "Test", email: "t@t.com" });
});

function setupInsertMock(returnValue: any) {
  (db.insert as any).mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([returnValue]),
    }),
  });
}

function setupUpdateMock(returnValue: any) {
  (db.update as any).mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([returnValue]),
      }),
    }),
  });
}

function setupSelectMock(returnValue: any) {
  (db.select as any).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(returnValue),
    }),
  });
}

describe("createTodo", () => {
  it("passes priority and due_date fields through to the database", async () => {
    const mockTodo = {
      id: "todo-1",
      title: "Test todo",
      description: null,
      project_id: null,
      priority: "high",
      due_date: "2026-03-01",
      completed: false,
      sort_order: 0,
      user_id: "user-1",
      workspace_id: "ws-1",
      created_at: new Date(),
      updated_at: new Date(),
    };

    setupSelectMock([{ maxOrder: 0 }]);
    setupInsertMock(mockTodo);

    const result = await createTodo("ws-1", "user-1", {
      title: "Test todo",
      priority: "high",
      due_date: "2026-03-01",
    });

    expect(result.priority).toBe("high");
    expect(result.due_date).toBe("2026-03-01");
    expect(result.title).toBe("Test todo");
  });

  it("defaults priority to 'none' when not specified", async () => {
    const mockTodo = {
      id: "todo-2",
      title: "No priority todo",
      description: null,
      project_id: null,
      priority: "none",
      due_date: null,
      completed: false,
      sort_order: 0,
      user_id: "user-1",
      workspace_id: "ws-1",
      created_at: new Date(),
      updated_at: new Date(),
    };

    setupSelectMock([{ maxOrder: -1 }]);
    setupInsertMock(mockTodo);

    const result = await createTodo("ws-1", "user-1", {
      title: "No priority todo",
    });

    expect(result.priority).toBe("none");
    expect(result.due_date).toBeNull();
  });
});

describe("updateTodo", () => {
  const existingTodo = {
    id: "todo-1",
    title: "Existing",
    description: null,
    project_id: null,
    priority: "none",
    due_date: null,
    completed: false,
    sort_order: 0,
    user_id: "user-1",
    workspace_id: "ws-1",
    created_at: new Date(),
    updated_at: new Date(),
  };

  it("changes priority from 'none' to 'high'", async () => {
    (db.query.todos.findFirst as any).mockResolvedValue(existingTodo);

    const updatedTodo = { ...existingTodo, priority: "high" };
    setupUpdateMock(updatedTodo);

    const result = await updateTodo("ws-1", "user-1", "todo-1", { priority: "high" });

    expect(result.priority).toBe("high");
  });

  it("sets due_date on a todo", async () => {
    (db.query.todos.findFirst as any).mockResolvedValue(existingTodo);

    const updatedTodo = { ...existingTodo, due_date: "2026-03-15" };
    setupUpdateMock(updatedTodo);

    const result = await updateTodo("ws-1", "user-1", "todo-1", { due_date: "2026-03-15" });

    expect(result.due_date).toBe("2026-03-15");
  });

  it("clears due_date by setting to null", async () => {
    const todoWithDate = { ...existingTodo, due_date: "2026-03-15" };
    (db.query.todos.findFirst as any).mockResolvedValue(todoWithDate);

    const updatedTodo = { ...todoWithDate, due_date: null };
    setupUpdateMock(updatedTodo);

    const result = await updateTodo("ws-1", "user-1", "todo-1", { due_date: null });

    expect(result.due_date).toBeNull();
  });

  it("updates both priority and due_date together", async () => {
    (db.query.todos.findFirst as any).mockResolvedValue(existingTodo);

    const updatedTodo = { ...existingTodo, priority: "medium", due_date: "2026-04-01" };
    setupUpdateMock(updatedTodo);

    const result = await updateTodo("ws-1", "user-1", "todo-1", {
      priority: "medium",
      due_date: "2026-04-01",
    });

    expect(result.priority).toBe("medium");
    expect(result.due_date).toBe("2026-04-01");
  });

  it("throws when todo not found", async () => {
    (db.query.todos.findFirst as any).mockResolvedValue(undefined);

    await expect(
      updateTodo("ws-1", "user-1", "nonexistent", { priority: "high" })
    ).rejects.toThrow("Todo not found");
  });
});

describe("getTodos", () => {
  it("returns todos with priority and due_date fields", async () => {
    const todosData = [
      {
        id: "todo-1",
        title: "High priority",
        priority: "high",
        due_date: "2026-03-01",
        completed: false,
        sort_order: 0,
        workspace_id: "ws-1",
        user_id: "user-1",
        project_id: null,
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "todo-2",
        title: "No priority",
        priority: "none",
        due_date: null,
        completed: false,
        sort_order: 1,
        workspace_id: "ws-1",
        user_id: "user-1",
        project_id: null,
        description: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    (db.query.todos.findMany as any).mockResolvedValue(todosData);

    const result = await getTodos("ws-1", "user-1");

    expect(result).toHaveLength(2);
    expect(result[0].priority).toBe("high");
    expect(result[0].due_date).toBe("2026-03-01");
    expect(result[1].priority).toBe("none");
    expect(result[1].due_date).toBeNull();
  });
});
