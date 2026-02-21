import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

// Mock dependencies
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1", name: "Test User" } } }),
}))

vi.mock("@/hooks/use-workspace", () => ({
  useWorkspace: () => ({ currentWorkspace: { id: "w1", name: "Test Workspace" } }),
}))

vi.mock("@/lib/api/attachments", () => ({
  getAttachments: vi.fn(),
  deleteAttachment: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { FileAttachment } from "@/components/todos/file-attachment"
import { getAttachments, deleteAttachment } from "@/lib/api/attachments"

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn()
})

const mockAttachments = [
  {
    id: "a1",
    todo_id: "t1",
    user_id: "u1",
    workspace_id: "w1",
    file_name: "screenshot.png",
    file_key: "uploads/w1/t1/screenshot.png",
    file_size: 256000,
    mime_type: "image/png",
    created_at: new Date(),
  },
  {
    id: "a2",
    todo_id: "t1",
    user_id: "u1",
    workspace_id: "w1",
    file_name: "report.pdf",
    file_key: "uploads/w1/t1/report.pdf",
    file_size: 1048576,
    mime_type: "application/pdf",
    created_at: new Date(),
  },
]

describe("FileAttachment", () => {
  it("renders attachment count", async () => {
    vi.mocked(getAttachments).mockResolvedValue(mockAttachments)

    render(<FileAttachment todoId="t1" />)

    await waitFor(() => {
      expect(screen.getByText("Attachments (2)")).toBeInTheDocument()
    })
  })

  it("displays file names", async () => {
    vi.mocked(getAttachments).mockResolvedValue(mockAttachments)

    render(<FileAttachment todoId="t1" />)

    await waitFor(() => {
      expect(screen.getByText("screenshot.png")).toBeInTheDocument()
      expect(screen.getByText("report.pdf")).toBeInTheDocument()
    })
  })

  it("displays file sizes", async () => {
    vi.mocked(getAttachments).mockResolvedValue(mockAttachments)

    render(<FileAttachment todoId="t1" />)

    await waitFor(() => {
      expect(screen.getByText("250.0 KB")).toBeInTheDocument()
      expect(screen.getByText("1.0 MB")).toBeInTheDocument()
    })
  })

  it("shows empty state with zero count", async () => {
    vi.mocked(getAttachments).mockResolvedValue([])

    render(<FileAttachment todoId="t1" />)

    await waitFor(() => {
      expect(screen.getByText("Attachments (0)")).toBeInTheDocument()
    })
  })

  it("renders upload button", async () => {
    vi.mocked(getAttachments).mockResolvedValue([])

    render(<FileAttachment todoId="t1" />)

    expect(screen.getByText("Upload")).toBeInTheDocument()
  })

  it("deletes an attachment", async () => {
    vi.mocked(getAttachments).mockResolvedValue(mockAttachments)
    vi.mocked(deleteAttachment).mockResolvedValue({ success: true })

    render(<FileAttachment todoId="t1" />)

    await waitFor(() => {
      expect(screen.getByText("screenshot.png")).toBeInTheDocument()
    })

    // Find delete buttons (there are 2 attachments, each has a delete button)
    const deleteButtons = screen.getAllByRole("button").filter(btn => btn.querySelector(".text-destructive"))
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(deleteAttachment).toHaveBeenCalledWith("a1", "w1", "u1")
    })
  })
})
