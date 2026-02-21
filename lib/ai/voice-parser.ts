"use server";

import OpenAI from "openai";

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface ParsedTodo {
  title: string;
  description?: string;
  project?: string;
  project_id?: string;
}

export interface ParsedTimesheet {
  task_description: string;
  project?: string;
  project_id?: string;
  hours?: number;
  date?: string;
  notes?: string;
}

export type ParseResult =
  | { type: "todo"; data: ParsedTodo }
  | { type: "timesheet"; data: ParsedTimesheet };

const TODO_SYSTEM_PROMPT = `You extract structured todo data from voice input.
Available projects: {projects}

Return JSON with these fields:
- "title" (string, required): The main task or action to be done
- "description" (string, optional): Additional details or context
- "project" (string, optional): Matched project name from the available list

Rules:
- Only use project names from the provided list (case-insensitive match). If no match, omit the "project" field.
- Keep the title concise and action-oriented.
- Put extra context or details in "description".`;

const TIMESHEET_SYSTEM_PROMPT = `You extract structured timesheet data from voice input.
Available projects: {projects}
Today's date is {today}.

Return JSON with these fields:
- "task_description" (string, required): What work was done
- "project" (string, optional): Matched project name from the available list
- "hours" (number, optional): Number of hours worked (e.g. 2, 1.5, 0.5)
- "date" (string, optional): Date in yyyy-MM-dd format. Resolve relative dates like "today", "yesterday", "last Monday" relative to today's date.
- "notes" (string, optional): Any additional notes

Rules:
- Only use project names from the provided list (case-insensitive match). If no match, omit the "project" field.
- If hours are mentioned, extract as a number.
- If a date is mentioned (relative or absolute), resolve to yyyy-MM-dd format.`;

function findProjectId(
  projectName: string | undefined,
  projectList: { name: string; id: string }[]
): string | undefined {
  if (!projectName) return undefined;
  const match = projectList.find(
    (p) => p.name.toLowerCase() === projectName.toLowerCase()
  );
  return match?.id;
}

export async function parseVoiceInput(
  text: string,
  type: "todo" | "timesheet",
  projects: { name: string; id: string }[]
): Promise<ParseResult> {
  const projectNames = projects.map((p) => p.name);

  try {
    const openai = getClient();
    const today = new Date().toISOString().split("T")[0];

    const systemPrompt =
      type === "todo"
        ? TODO_SYSTEM_PROMPT.replace(
            "{projects}",
            projectNames.length > 0 ? projectNames.join(", ") : "None"
          )
        : TIMESHEET_SYSTEM_PROMPT.replace(
            "{projects}",
            projectNames.length > 0 ? projectNames.join(", ") : "None"
          ).replace("{today}", today);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return fallback(text, type);
    }

    const parsed = JSON.parse(content);

    if (type === "todo") {
      const data: ParsedTodo = {
        title: parsed.title || text,
        description: parsed.description || undefined,
        project: parsed.project || undefined,
        project_id: findProjectId(parsed.project, projects),
      };
      return { type: "todo", data };
    } else {
      const data: ParsedTimesheet = {
        task_description: parsed.task_description || text,
        project: parsed.project || undefined,
        project_id: findProjectId(parsed.project, projects),
        hours: typeof parsed.hours === "number" ? parsed.hours : undefined,
        date: parsed.date || undefined,
        notes: parsed.notes || undefined,
      };
      return { type: "timesheet", data };
    }
  } catch {
    return fallback(text, type);
  }
}

function fallback(text: string, type: "todo" | "timesheet"): ParseResult {
  if (type === "todo") {
    return { type: "todo", data: { title: text } };
  }
  return { type: "timesheet", data: { task_description: text } };
}
