import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { parseVoiceInput } from "@/lib/ai/voice-parser";

export async function POST(req: NextRequest) {
  let text = "";
  let type: "todo" | "timesheet" = "todo";

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    text = body.text || "";
    type = body.type === "timesheet" ? "timesheet" : "todo";
    const projects = Array.isArray(body.projects) ? body.projects : [];

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const result = await parseVoiceInput(text, type, projects);

    return NextResponse.json(result);
  } catch {
    // Return fallback data so the client can still work
    if (type === "timesheet") {
      return NextResponse.json({
        type: "timesheet",
        data: { task_description: text },
      });
    }

    return NextResponse.json({
      type: "todo",
      data: { title: text },
    });
  }
}
