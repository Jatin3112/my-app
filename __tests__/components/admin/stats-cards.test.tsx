import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { AdminStatsCards } from "@/components/admin/stats-cards"

describe("AdminStatsCards", () => {
  const stats = {
    totalUsers: 42,
    totalWorkspaces: 5,
    activeTrials: 3,
    activeSubscriptions: 2,
  }

  it("renders all four stat cards", () => {
    render(<AdminStatsCards stats={stats} />)
    expect(screen.getByText("Total Users")).toBeInTheDocument()
    expect(screen.getByText("Total Workspaces")).toBeInTheDocument()
    expect(screen.getByText("Active Trials")).toBeInTheDocument()
    expect(screen.getByText("Active Subscriptions")).toBeInTheDocument()
  })

  it("displays correct values", () => {
    render(<AdminStatsCards stats={stats} />)
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("handles zero values", () => {
    render(
      <AdminStatsCards
        stats={{ totalUsers: 0, totalWorkspaces: 0, activeTrials: 0, activeSubscriptions: 0 }}
      />
    )
    const zeros = screen.getAllByText("0")
    expect(zeros).toHaveLength(4)
  })
})
