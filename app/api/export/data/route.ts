import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth-options"
import { db } from "@/lib/db"
import { users, todos, timesheetEntries, comments, workspaceMembers, attachments, notificationPreferences } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const [user, userTodos, userTimesheet, userComments, memberships, userAttachments, notifPrefs] =
      await Promise.all([
        db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { id: true, email: true, name: true, created_at: true },
        }),
        db.select().from(todos).where(eq(todos.user_id, userId)),
        db.select().from(timesheetEntries).where(eq(timesheetEntries.user_id, userId)),
        db.select().from(comments).where(eq(comments.user_id, userId)),
        db.select().from(workspaceMembers).where(eq(workspaceMembers.user_id, userId)),
        db.select().from(attachments).where(eq(attachments.user_id, userId)),
        db.select().from(notificationPreferences).where(eq(notificationPreferences.user_id, userId)),
      ])

    const exportData = {
      exported_at: new Date().toISOString(),
      user,
      todos: userTodos,
      timesheet_entries: userTimesheet,
      comments: userComments,
      workspace_memberships: memberships,
      attachments: userAttachments,
      notification_preferences: notifPrefs,
    }

    const json = JSON.stringify(exportData, null, 2)

    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="voicetask-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
