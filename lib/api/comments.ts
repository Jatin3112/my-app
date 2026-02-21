"use server"

import { db } from "@/lib/db"
import { comments, users, todos, type Comment } from "@/lib/db/schema"
import { eq, and, asc } from "drizzle-orm"
import { requirePermission, getMemberRole } from "@/lib/auth/permissions"
import { createNotification } from "@/lib/api/notifications"
import { sanitizeHtml } from "@/lib/api/sanitize"

export async function getComments(todoId: string, workspaceId: string) {
  const data = await db.query.comments.findMany({
    where: and(
      eq(comments.todo_id, todoId),
      eq(comments.workspace_id, workspaceId)
    ),
    with: {
      user: true,
    },
    orderBy: [asc(comments.created_at)],
  })

  return data.map((c) => ({
    ...c,
    user_name: c.user?.name ?? null,
    user_email: c.user?.email ?? "Unknown",
  }))
}

export async function createComment(
  workspaceId: string,
  userId: string,
  todoId: string,
  content: string
): Promise<Comment> {
  const role = await getMemberRole(userId, workspaceId)
  if (!role) throw new Error("Not a member of this workspace")

  const [comment] = await db
    .insert(comments)
    .values({
      todo_id: todoId,
      workspace_id: workspaceId,
      user_id: userId,
      content: sanitizeHtml(content),
      updated_at: new Date(),
    })
    .returning()

  const actor = await db.query.users.findFirst({ where: eq(users.id, userId) })
  const todo = await db.query.todos.findFirst({ where: eq(todos.id, todoId) })
  const actorName = actor?.name || actor?.email || "Someone"
  await createNotification(workspaceId, userId, "comment_added", "comment", comment.id, `${actorName} commented on "${todo?.title || "a todo"}"`)
    .catch(() => {})

  return comment
}

export async function updateComment(
  commentId: string,
  userId: string,
  content: string
): Promise<Comment> {
  const existing = await db.query.comments.findFirst({ where: eq(comments.id, commentId) })
  if (!existing) throw new Error("Comment not found")
  if (existing.user_id !== userId) throw new Error("Cannot edit another user's comment")

  const [updated] = await db
    .update(comments)
    .set({ content: sanitizeHtml(content), updated_at: new Date() })
    .where(eq(comments.id, commentId))
    .returning()

  return updated
}

export async function deleteComment(
  workspaceId: string,
  userId: string,
  commentId: string
): Promise<void> {
  const existing = await db.query.comments.findFirst({ where: eq(comments.id, commentId) })
  if (!existing) throw new Error("Comment not found")

  if (existing.user_id !== userId) {
    await requirePermission(userId, workspaceId, "comment:delete_any")
  }

  await db.delete(comments).where(eq(comments.id, commentId))
}
