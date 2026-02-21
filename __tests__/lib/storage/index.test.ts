import { describe, it, expect } from "vitest"
import { getFileUrl, getStorageKey, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/storage"

describe("getStorageKey", () => {
  it("generates correct path", () => {
    const key = getStorageKey("w1", "t1", "screenshot.png")
    expect(key).toBe("uploads/w1/t1/screenshot.png")
  })

  it("sanitizes filename with spaces and special chars", () => {
    const key = getStorageKey("w1", "t1", "my file (1).png")
    expect(key).not.toContain(" ")
    expect(key).not.toContain("(")
    expect(key).toBe("uploads/w1/t1/my-file-1-.png")
  })

  it("lowercases filename", () => {
    const key = getStorageKey("w1", "t1", "MyFile.PNG")
    expect(key).toBe("uploads/w1/t1/myfile.png")
  })
})

describe("getFileUrl", () => {
  it("returns public URL path", () => {
    const url = getFileUrl("uploads/w1/t1/screenshot.png")
    expect(url).toBe("/uploads/w1/t1/screenshot.png")
  })
})

describe("constants", () => {
  it("has allowed MIME types including images and documents", () => {
    expect(ALLOWED_MIME_TYPES).toContain("image/png")
    expect(ALLOWED_MIME_TYPES).toContain("image/jpeg")
    expect(ALLOWED_MIME_TYPES).toContain("application/pdf")
    expect(ALLOWED_MIME_TYPES).toContain("text/plain")
  })

  it("max file size is 10MB", () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024)
  })
})
