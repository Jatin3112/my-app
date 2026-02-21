import { mkdir, writeFile, unlink } from "fs/promises"
import path from "path"

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
}

export function getStorageKey(workspaceId: string, todoId: string, fileName: string): string {
  return `uploads/${workspaceId}/${todoId}/${sanitizeFilename(fileName)}`
}

export function getFileUrl(fileKey: string): string {
  return `/${fileKey}`
}

export async function uploadFile(fileKey: string, data: Buffer): Promise<void> {
  const filePath = path.join(process.cwd(), "public", fileKey)
  const dir = path.dirname(filePath)
  await mkdir(dir, { recursive: true })
  await writeFile(filePath, data)
}

export async function deleteFile(fileKey: string): Promise<void> {
  const filePath = path.join(process.cwd(), "public", fileKey)
  try {
    await unlink(filePath)
  } catch {
    // File may already be deleted
  }
}
