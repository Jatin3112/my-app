import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PricingCards } from "@/components/billing/pricing-cards";
import { createSoloPlan, createTeamPlan, createMockPlan } from "../../utils/test-helpers";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe("PricingCards", () => {
  const plans = [createSoloPlan(), createTeamPlan(), createMockPlan()];

  it("renders all plan cards", () => {
    render(<PricingCards plans={plans} currentPlanName={null} currency="INR" workspaceId="ws-1" />);
    expect(screen.getByText("Solo")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Agency")).toBeInTheDocument();
  });

  it("shows INR prices", () => {
    render(<PricingCards plans={plans} currentPlanName={null} currency="INR" workspaceId="ws-1" />);
    expect(screen.getByText(/₹499/)).toBeInTheDocument();
    expect(screen.getByText(/₹999/)).toBeInTheDocument();
    expect(screen.getByText(/₹1999/)).toBeInTheDocument();
  });

  it("shows USD prices", () => {
    render(<PricingCards plans={plans} currentPlanName={null} currency="USD" workspaceId="ws-1" />);
    expect(screen.getByText(/\$9/)).toBeInTheDocument();
    expect(screen.getByText(/\$19/)).toBeInTheDocument();
    expect(screen.getByText(/\$35/)).toBeInTheDocument();
  });

  it("marks current plan with badge", () => {
    render(<PricingCards plans={plans} currentPlanName="Team" currency="INR" workspaceId="ws-1" />);
    // Badge + Button both say "Current Plan"
    expect(screen.getAllByText("Current Plan").length).toBeGreaterThanOrEqual(2);
  });

  it("disables button for current plan", () => {
    render(<PricingCards plans={plans} currentPlanName="Solo" currency="INR" workspaceId="ws-1" />);
    const buttons = screen.getAllByRole("button");
    const currentBtn = buttons.find(b => b.textContent === "Current Plan");
    expect(currentBtn).toBeDisabled();
  });

  it("shows Unlimited for -1 values", () => {
    render(<PricingCards plans={plans} currentPlanName={null} currency="INR" workspaceId="ws-1" />);
    expect(screen.getAllByText(/Unlimited/).length).toBeGreaterThanOrEqual(2);
  });

  it("renders feature list", () => {
    const { container } = render(<PricingCards plans={plans} currentPlanName={null} currency="INR" workspaceId="ws-1" />);
    // Features like "voice_capture" are rendered as "voice capture" in spans
    const spans = container.querySelectorAll("span");
    const featureTexts = Array.from(spans).map(s => s.textContent);
    // Mock uses "voice-capture" (hyphens), replace only affects underscores
    expect(featureTexts.some(t => t === "voice-capture")).toBe(true);
  });
});
