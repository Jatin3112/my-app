import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock dependencies
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock("@/lib/auth/permissions", () => ({
  getMemberRole: vi.fn().mockResolvedValue("member"),
}))

vi.mock("@/lib/storage", () => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  getStorageKey: vi.fn((ws: string, todo: string, file: string) => `uploads/${ws}/${todo}/${file}`),
  ALLOWED_MIME_TYPES: ["image/png", "image/jpeg", "application/pdf", "text/plain"],
  MAX_FILE_SIZE: 10 * 1024 * 1024,
}))

vi.mock("@/lib/db/schema", () => ({
  attachments: { todo_id: "todo_id", workspace_id: "workspace_id", id: "id", file_size: "file_size", created_at: "created_at" },
}))

import { getAttachments, createAttachment, deleteAttachment, getWorkspaceStorageUsage } from "@/lib/api/attachments"
import { db } from "@/lib/db"
import { getMemberRole } from "@/lib/auth/permissions"
import { uploadFile, deleteFile } from "@/lib/storage"

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getMemberRole).mockResolvedValue("member")
})

// Helper to mock select().from().where().orderBy() chain
function mockSelectChain(result: any[]) {
  const mockOrderBy = vi.fn().mockResolvedValue(result)
  const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
  vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any)
}

function mockSelectWhereOnly(result: any[]) {
  const mockWhere = vi.fn().mockResolvedValue(result)
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
  vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any)
}

describe("getAttachments", () => {
  it("returns attachments for a todo", async () => {
    const mockAttachments = [
      { id: "a1", todo_id: "t1", file_name: "test.png", file_key: "uploads/w1/t1/test.png" },
    ]
    mockSelectChain(mockAttachments)

    const result = await getAttachments("t1", "w1", "u1")
    expect(result).toEqual(mockAttachments)
    expect(getMemberRole).toHaveBeenCalledWith("u1", "w1")
  })

  it("throws when user is not a member", async () => {
    vi.mocked(getMemberRole).mockResolvedValue(null)

    await expect(getAttachments("t1", "w1", "u1")).rejects.toThrow("Not a workspace member")
  })
})

describe("createAttachment", () => {
  it("creates an attachment with valid file", async () => {
    const mockAttachment = {
      id: "a1",
      todo_id: "t1",
      file_name: "photo.png",
      file_key: "uploads/w1/t1/photo.png",
      file_size: 1024,
      mime_type: "image/png",
    }
    const mockReturning = vi.fn().mockResolvedValue([mockAttachment])
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any)

    const fileData = Buffer.alloc(1024)
    const result = await createAttachment("w1", "u1", "t1", "photo.png", "image/png", fileData)

    expect(result).toEqual(mockAttachment)
    expect(uploadFile).toHaveBeenCalledWith("uploads/w1/t1/photo.png", fileData)
    expect(getMemberRole).toHaveBeenCalledWith("u1", "w1")
  })

  it("rejects disallowed MIME types", async () => {
    const fileData = Buffer.alloc(100)
    await expect(
      createAttachment("w1", "u1", "t1", "virus.exe", "application/x-msdownload", fileData)
    ).rejects.toThrow("File type not allowed")
  })

  it("rejects files exceeding size limit", async () => {
    const fileData = Buffer.alloc(11 * 1024 * 1024) // 11MB
    await expect(
      createAttachment("w1", "u1", "t1", "huge.png", "image/png", fileData)
    ).rejects.toThrow("File exceeds maximum size")
  })
})

describe("deleteAttachment", () => {
  it("deletes an existing attachment", async () => {
    const mockAttachment = {
      id: "a1",
      file_key: "uploads/w1/t1/test.png",
      workspace_id: "w1",
    }
    mockSelectWhereOnly([mockAttachment])

    const mockWhere = vi.fn().mockResolvedValue(undefined)
    vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as any)

    const result = await deleteAttachment("a1", "w1", "u1")
    expect(result).toEqual({ success: true })
    expect(deleteFile).toHaveBeenCalledWith("uploads/w1/t1/test.png")
  })

  it("throws when attachment not found", async () => {
    mockSelectWhereOnly([])

    await expect(deleteAttachment("missing", "w1", "u1")).rejects.toThrow("Attachment not found")
  })
})

describe("getWorkspaceStorageUsage", () => {
  it("returns total bytes used", async () => {
    mockSelectWhereOnly([{ total: "5242880" }])

    const result = await getWorkspaceStorageUsage("w1")
    expect(result).toBe(5242880)
  })

  it("returns 0 when no attachments", async () => {
    mockSelectWhereOnly([{ total: null }])

    const result = await getWorkspaceStorageUsage("w1")
    expect(result).toBe(0)
  })
})
