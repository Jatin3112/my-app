import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mockCreate is available when vi.mock factory runs (vi.mock is hoisted)
const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

import { parseVoiceInput } from "@/lib/ai/voice-parser";

function mockOpenAIResponse(content: Record<string, unknown>) {
  mockCreate.mockResolvedValueOnce({
    choices: [{ message: { content: JSON.stringify(content) } }],
  });
}

const testProjects = [
  { name: "Acme", id: "proj-1" },
  { name: "Widget Corp", id: "proj-2" },
];

describe("parseVoiceInput", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  describe("todo parsing", () => {
    it("parses a basic todo", async () => {
      mockOpenAIResponse({
        title: "Call client about invoice",
      });

      const result = await parseVoiceInput(
        "Call client about invoice",
        "todo",
        testProjects
      );

      expect(result.type).toBe("todo");
      expect(result.data).toEqual({
        title: "Call client about invoice",
        description: undefined,
        project: undefined,
        project_id: undefined,
      });
    });

    it("parses a todo with project match", async () => {
      mockOpenAIResponse({
        title: "Fix bug on homepage",
        project: "Acme",
      });

      const result = await parseVoiceInput(
        "Fix bug on Acme homepage",
        "todo",
        testProjects
      );

      expect(result.type).toBe("todo");
      expect(result.data).toEqual({
        title: "Fix bug on homepage",
        description: undefined,
        project: "Acme",
        project_id: "proj-1",
      });
    });

    it("parses a todo with description", async () => {
      mockOpenAIResponse({
        title: "Review PR",
        description: "Check the new auth flow implementation",
        project: "Widget Corp",
      });

      const result = await parseVoiceInput(
        "Review PR for Widget Corp check the new auth flow implementation",
        "todo",
        testProjects
      );

      expect(result.type).toBe("todo");
      expect(result.data).toEqual({
        title: "Review PR",
        description: "Check the new auth flow implementation",
        project: "Widget Corp",
        project_id: "proj-2",
      });
    });

    it("handles case-insensitive project matching", async () => {
      mockOpenAIResponse({
        title: "Deploy app",
        project: "acme",
      });

      const result = await parseVoiceInput(
        "Deploy app for acme",
        "todo",
        testProjects
      );

      expect(result.type).toBe("todo");
      expect(result.data).toMatchObject({
        project: "acme",
        project_id: "proj-1",
      });
    });
  });

  describe("timesheet parsing", () => {
    it("parses a full timesheet entry", async () => {
      mockOpenAIResponse({
        task_description: "Homepage redesign",
        project: "Acme",
        hours: 3,
        date: "2026-02-21",
      });

      const result = await parseVoiceInput(
        "Worked 3 hours on homepage redesign for Acme",
        "timesheet",
        testProjects
      );

      expect(result.type).toBe("timesheet");
      expect(result.data).toEqual({
        task_description: "Homepage redesign",
        project: "Acme",
        project_id: "proj-1",
        hours: 3,
        date: "2026-02-21",
        notes: undefined,
      });
    });

    it("parses timesheet with notes", async () => {
      mockOpenAIResponse({
        task_description: "Bug fixes",
        project: "Widget Corp",
        hours: 1.5,
        date: "2026-02-20",
        notes: "Fixed login issue",
      });

      const result = await parseVoiceInput(
        "Yesterday spent 1.5 hours on bug fixes for Widget Corp fixed login issue",
        "timesheet",
        testProjects
      );

      expect(result.type).toBe("timesheet");
      expect(result.data).toMatchObject({
        task_description: "Bug fixes",
        hours: 1.5,
        notes: "Fixed login issue",
      });
    });
  });

  describe("empty project list", () => {
    it("parses without projects", async () => {
      mockOpenAIResponse({
        title: "Buy groceries",
      });

      const result = await parseVoiceInput("Buy groceries", "todo", []);

      expect(result.type).toBe("todo");
      expect(result.data).toEqual({
        title: "Buy groceries",
        description: undefined,
        project: undefined,
        project_id: undefined,
      });
    });
  });

  describe("fallback on error", () => {
    it("returns raw text as todo title on OpenAI error", async () => {
      mockCreate.mockRejectedValueOnce(new Error("API error"));

      const result = await parseVoiceInput(
        "Some task text",
        "todo",
        testProjects
      );

      expect(result.type).toBe("todo");
      expect(result.data).toEqual({ title: "Some task text" });
    });

    it("returns raw text as timesheet description on OpenAI error", async () => {
      mockCreate.mockRejectedValueOnce(new Error("API error"));

      const result = await parseVoiceInput(
        "Did some work today",
        "timesheet",
        testProjects
      );

      expect(result.type).toBe("timesheet");
      expect(result.data).toEqual({ task_description: "Did some work today" });
    });

    it("falls back when response has no content", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      const result = await parseVoiceInput(
        "Some text",
        "todo",
        testProjects
      );

      expect(result.type).toBe("todo");
      expect(result.data).toEqual({ title: "Some text" });
    });

    it("falls back when response is invalid JSON", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "not json" } }],
      });

      const result = await parseVoiceInput(
        "Some text",
        "todo",
        testProjects
      );

      expect(result.type).toBe("todo");
      expect(result.data).toEqual({ title: "Some text" });
    });
  });

  describe("OpenAI API call", () => {
    it("sends correct parameters for todo", async () => {
      mockOpenAIResponse({ title: "test" });

      await parseVoiceInput("test input", "todo", testProjects);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0.1,
        })
      );

      const systemMsg = mockCreate.mock.calls[0][0].messages[0].content;
      expect(systemMsg).toContain("Acme");
      expect(systemMsg).toContain("Widget Corp");
    });

    it("sends correct parameters for timesheet", async () => {
      mockOpenAIResponse({ task_description: "test" });

      await parseVoiceInput("test input", "timesheet", testProjects);

      const systemMsg = mockCreate.mock.calls[0][0].messages[0].content;
      expect(systemMsg).toContain("Today's date is");
      expect(systemMsg).toContain("Acme");
    });
  });
});
