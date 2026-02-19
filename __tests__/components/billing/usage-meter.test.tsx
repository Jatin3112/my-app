import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UsageMeter } from "@/components/billing/usage-meter";
import type { UsageInfo } from "@/lib/api/subscriptions";

describe("UsageMeter", () => {
  it("renders all three meters", () => {
    const usage: UsageInfo = {
      currentUsers: 2,
      currentProjects: 3,
      currentWorkspaces: 1,
      limits: { maxUsers: 5, maxProjects: 10, maxWorkspaces: 3, features: [] },
    };
    render(<UsageMeter usage={usage} />);
    expect(screen.getByText("Team Members")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Workspaces")).toBeInTheDocument();
  });

  it("shows normal usage numbers", () => {
    const usage: UsageInfo = {
      currentUsers: 2,
      currentProjects: 3,
      currentWorkspaces: 1,
      limits: { maxUsers: 5, maxProjects: 10, maxWorkspaces: 3, features: [] },
    };
    render(<UsageMeter usage={usage} />);
    expect(screen.getByText("2 / 5")).toBeInTheDocument();
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("shows 'Unlimited' for -1 limits", () => {
    const usage: UsageInfo = {
      currentUsers: 5,
      currentProjects: 20,
      currentWorkspaces: 3,
      limits: { maxUsers: 15, maxProjects: -1, maxWorkspaces: -1, features: [] },
    };
    render(<UsageMeter usage={usage} />);
    expect(screen.getByText("5 / 15")).toBeInTheDocument();
    expect(screen.getByText("20 / Unlimited")).toBeInTheDocument();
    expect(screen.getByText("3 / Unlimited")).toBeInTheDocument();
  });

  it("applies red styling at limit", () => {
    const usage: UsageInfo = {
      currentUsers: 5,
      currentProjects: 3,
      currentWorkspaces: 1,
      limits: { maxUsers: 5, maxProjects: 3, maxWorkspaces: 1, features: [] },
    };
    const { container } = render(<UsageMeter usage={usage} />);
    // At-limit values should have red text
    const redTexts = container.querySelectorAll(".text-red-600");
    expect(redTexts.length).toBeGreaterThanOrEqual(3);
  });

  it("applies yellow styling near limit (>=80%)", () => {
    const usage: UsageInfo = {
      currentUsers: 4,
      currentProjects: 8,
      currentWorkspaces: 1,
      limits: { maxUsers: 5, maxProjects: 10, maxWorkspaces: 3, features: [] },
    };
    const { container } = render(<UsageMeter usage={usage} />);
    // 4/5 = 80%, 8/10 = 80% should be yellow
    const yellowTexts = container.querySelectorAll(".text-yellow-600");
    expect(yellowTexts.length).toBeGreaterThanOrEqual(2);
  });

  it("does not render progress bars for unlimited meters", () => {
    const usage: UsageInfo = {
      currentUsers: 5,
      currentProjects: 20,
      currentWorkspaces: 3,
      limits: { maxUsers: -1, maxProjects: -1, maxWorkspaces: -1, features: [] },
    };
    const { container } = render(<UsageMeter usage={usage} />);
    // No progress bars should exist for unlimited
    const bars = container.querySelectorAll(".bg-primary, .bg-red-500, .bg-yellow-500");
    expect(bars.length).toBe(0);
  });
});
