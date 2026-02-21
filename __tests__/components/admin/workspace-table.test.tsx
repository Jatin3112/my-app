import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { WorkspaceTable } from "@/components/admin/workspace-table"

// Mock server actions
vi.mock("@/lib/api/admin", () => ({
  extendTrial: vi.fn().mockResolvedValue({ success: true, newTrialEnd: new Date() }),
  changeWorkspacePlan: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockPlans = [
  { id: "plan-1", name: "Solo", slug: "solo" },
  { id: "plan-2", name: "Team", slug: "team" },
  { id: "plan-3", name: "Agency", slug: "agency" },
]

const mockWorkspaces = [
  {
    id: "ws-1",
    name: "Acme Corp",
    slug: "acme-corp",
    owner_id: "user-1",
    created_at: new Date("2026-01-15"),
    memberCount: 3,
    planName: "Team",
    status: "active",
    trialEnd: null,
  },
  {
    id: "ws-2",
    name: "Freelancer Inc",
    slug: "freelancer-inc",
    owner_id: "user-2",
    created_at: new Date("2026-02-01"),
    memberCount: 1,
    planName: "Solo",
    status: "trialing",
    trialEnd: new Date("2026-03-01"),
  },
]

describe("WorkspaceTable", () => {
  it("renders table headers", () => {
    render(<WorkspaceTable workspaces={mockWorkspaces} plans={mockPlans} />)
    expect(screen.getByText("Workspace")).toBeInTheDocument()
    expect(screen.getByText("Plan")).toBeInTheDocument()
    expect(screen.getByText("Status")).toBeInTheDocument()
    expect(screen.getByText("Members")).toBeInTheDocument()
  })

  it("renders workspace rows", () => {
    render(<WorkspaceTable workspaces={mockWorkspaces} plans={mockPlans} />)
    expect(screen.getByText("Acme Corp")).toBeInTheDocument()
    expect(screen.getByText("Freelancer Inc")).toBeInTheDocument()
    expect(screen.getByText("Team")).toBeInTheDocument()
    expect(screen.getByText("Solo")).toBeInTheDocument()
  })

  it("shows status badges", () => {
    render(<WorkspaceTable workspaces={mockWorkspaces} plans={mockPlans} />)
    expect(screen.getByText("active")).toBeInTheDocument()
    expect(screen.getByText("trialing")).toBeInTheDocument()
  })

  it("shows member counts", () => {
    render(<WorkspaceTable workspaces={mockWorkspaces} plans={mockPlans} />)
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("renders Extend Trial and Change Plan buttons for each workspace", () => {
    render(<WorkspaceTable workspaces={mockWorkspaces} plans={mockPlans} />)
    const extendButtons = screen.getAllByText("Extend Trial")
    const changeButtons = screen.getAllByText("Change Plan")
    expect(extendButtons).toHaveLength(2)
    expect(changeButtons).toHaveLength(2)
  })

  it("shows empty state when no workspaces", () => {
    render(<WorkspaceTable workspaces={[]} plans={mockPlans} />)
    expect(screen.getByText("No workspaces found")).toBeInTheDocument()
  })

  it("displays trial end date for trialing workspaces", () => {
    render(<WorkspaceTable workspaces={mockWorkspaces} plans={mockPlans} />)
    expect(screen.getByText("—")).toBeInTheDocument()
  })
})
