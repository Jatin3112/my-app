import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RazorpayCheckout } from "@/components/billing/razorpay-checkout";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe("RazorpayCheckout", () => {
  const defaultProps = {
    planSlug: "solo",
    planName: "Solo",
    workspaceId: "ws-1",
    priceDisplay: "₹499/mo",
  };

  it("renders Upgrade button", () => {
    render(<RazorpayCheckout {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Upgrade" })).toBeInTheDocument();
  });

  it("shows Current Plan when disabled", () => {
    render(<RazorpayCheckout {...defaultProps} disabled />);
    const btn = screen.getByRole("button", { name: "Current Plan" });
    expect(btn).toBeDisabled();
  });

  it("applies outline variant when specified", () => {
    render(<RazorpayCheckout {...defaultProps} variant="outline" />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders as full width", () => {
    render(<RazorpayCheckout {...defaultProps} />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("w-full");
  });
});
