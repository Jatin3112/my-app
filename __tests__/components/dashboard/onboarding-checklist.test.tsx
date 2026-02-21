import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

const mockDismissOnboarding = vi.fn().mockResolvedValue(undefined)

vi.mock("@/lib/api/onboarding", () => ({
  dismissOnboarding: (...args: unknown[]) => mockDismissOnboarding(...args),
}))

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist"
import type { OnboardingStatus } from "@/lib/api/onboarding"
import { toast } from "sonner"

const baseStatus: OnboardingStatus = {
  steps: { created_project: false, added_todo: false, tried_voice: false, invited_member: false },
  completed: 0,
  total: 4,
  dismissed: false,
  allDone: false,
}

describe("OnboardingChecklist", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders all 4 steps", () => {
    render(<OnboardingChecklist status={baseStatus} userId="u1" />)
    expect(screen.getByText("Create a project")).toBeInTheDocument()
    expect(screen.getByText("Add a todo")).toBeInTheDocument()
    expect(screen.getByText("Try voice capture")).toBeInTheDocument()
    expect(screen.getByText("Invite a team member")).toBeInTheDocument()
  })

  it("renders the Getting Started title", () => {
    render(<OnboardingChecklist status={baseStatus} userId="u1" />)
    expect(screen.getByText("Getting Started")).toBeInTheDocument()
  })

  it("shows progress count 0 of 4", () => {
    render(<OnboardingChecklist status={baseStatus} userId="u1" />)
    expect(screen.getByText("0 of 4 complete")).toBeInTheDocument()
  })

  it("shows progress count 2 of 4", () => {
    const status: OnboardingStatus = {
      ...baseStatus,
      completed: 2,
      steps: { created_project: true, added_todo: true, tried_voice: false, invited_member: false },
    }
    render(<OnboardingChecklist status={status} userId="u1" />)
    expect(screen.getByText("2 of 4 complete")).toBeInTheDocument()
    expect(screen.getByText("50%")).toBeInTheDocument()
  })

  it("shows 100% when all steps complete but allDone false", () => {
    const status: OnboardingStatus = {
      ...baseStatus,
      completed: 4,
      steps: { created_project: true, added_todo: true, tried_voice: true, invited_member: true },
      allDone: false,
    }
    render(<OnboardingChecklist status={status} userId="u1" />)
    expect(screen.getByText("4 of 4 complete")).toBeInTheDocument()
    expect(screen.getByText("100%")).toBeInTheDocument()
  })

  it("hides when allDone is true", () => {
    const status: OnboardingStatus = { ...baseStatus, allDone: true, completed: 4 }
    const { container } = render(<OnboardingChecklist status={status} userId="u1" />)
    expect(container.innerHTML).toBe("")
  })

  it("hides when dismissed is true", () => {
    const status: OnboardingStatus = { ...baseStatus, dismissed: true }
    const { container } = render(<OnboardingChecklist status={status} userId="u1" />)
    expect(container.innerHTML).toBe("")
  })

  it("calls dismissOnboarding and hides on X click", async () => {
    render(<OnboardingChecklist status={baseStatus} userId="u1" />)
    const dismissBtn = screen.getByRole("button")
    fireEvent.click(dismissBtn)
    expect(mockDismissOnboarding).toHaveBeenCalledWith("u1")
    // Component should vanish after optimistic dismiss
    await waitFor(() => {
      expect(screen.queryByText("Getting Started")).not.toBeInTheDocument()
    })
  })

  it("shows error toast and reappears when dismiss fails", async () => {
    mockDismissOnboarding.mockRejectedValueOnce(new Error("fail"))
    render(<OnboardingChecklist status={baseStatus} userId="u1" />)
    const dismissBtn = screen.getByRole("button")
    fireEvent.click(dismissBtn)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to dismiss")
    })
    // Component should reappear after failed dismiss
    expect(screen.getByText("Getting Started")).toBeInTheDocument()
  })

  it("applies line-through styling for completed steps", () => {
    const status: OnboardingStatus = {
      ...baseStatus,
      completed: 1,
      steps: { created_project: true, added_todo: false, tried_voice: false, invited_member: false },
    }
    render(<OnboardingChecklist status={status} userId="u1" />)
    const completedLink = screen.getByText("Create a project").closest("a")
    expect(completedLink?.className).toContain("line-through")
  })

  it("does not apply line-through for incomplete steps", () => {
    render(<OnboardingChecklist status={baseStatus} userId="u1" />)
    const incompleteLink = screen.getByText("Add a todo").closest("a")
    expect(incompleteLink?.className).not.toContain("line-through")
  })

  it("links steps to correct hrefs", () => {
    render(<OnboardingChecklist status={baseStatus} userId="u1" />)
    const projectLink = screen.getByText("Create a project").closest("a")
    const inviteLink = screen.getByText("Invite a team member").closest("a")
    expect(projectLink).toHaveAttribute("href", "/todos")
    expect(inviteLink).toHaveAttribute("href", "/workspace/settings")
  })
})
