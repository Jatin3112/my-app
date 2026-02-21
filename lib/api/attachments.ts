"use server"

import { db } from "@/lib/db"
import { attachments } from "@/lib/db/schema"
import { eq, and, sum } from "drizzle-orm"
import { getMemberRole } from "@/lib/auth/permissions"
import { uploadFile, deleteFile, getStorageKey, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/storage"

async function requireMembership(userId: string, workspaceId: string) {
  const role = await getMemberRole(userId, workspaceId)
  if (!role) throw new Error("Not a workspace member")
  return role
}

export async function getAttachments(todoId: string, workspaceId: string, userId: string) {
  await requireMembership(userId, workspaceId)

  return db
    .select()
    .from(attachments)
    .where(and(eq(attachments.todo_id, todoId), eq(attachments.workspace_id, workspaceId)))
    .orderBy(attachments.created_at)
}

export async function createAttachment(
  workspaceId: string,
  userId: string,
  todoId: string,
  fileName: string,
  mimeType: string,
  fileData: Buffer,
) {
  await requireMembership(userId, workspaceId)

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}`)
  }

  if (fileData.length > MAX_FILE_SIZE) {
    throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }

  const fileKey = getStorageKey(workspaceId, todoId, fileName)
  await uploadFile(fileKey, fileData)

  const [attachment] = await db
    .insert(attachments)
    .values({
      todo_id: todoId,
      user_id: userId,
      workspace_id: workspaceId,
      file_name: fileName,
      file_key: fileKey,
      file_size: fileData.length,
      mime_type: mimeType,
    })
    .returning()

  return attachment
}

export async function deleteAttachment(attachmentId: string, workspaceId: string, userId: string) {
  await requireMembership(userId, workspaceId)

  const [attachment] = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, attachmentId), eq(attachments.workspace_id, workspaceId)))

  if (!attachment) {
    throw new Error("Attachment not found")
  }

  await deleteFile(attachment.file_key)
  await db.delete(attachments).where(eq(attachments.id, attachmentId))

  return { success: true }
}

export async function getWorkspaceStorageUsage(workspaceId: string): Promise<number> {
  const [result] = await db
    .select({ total: sum(attachments.file_size) })
    .from(attachments)
    .where(eq(attachments.workspace_id, workspaceId))

  return Number(result?.total ?? 0)
}
