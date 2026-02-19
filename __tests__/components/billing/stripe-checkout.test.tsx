import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StripeCheckout } from "@/components/billing/stripe-checkout";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("StripeCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the upgrade button", () => {
    render(
      <StripeCheckout
        planSlug="solo"
        planName="Solo"
        workspaceId="ws_1"
        priceDisplay="$9/mo"
      />
    );
    expect(screen.getByRole("button", { name: "Upgrade" })).toBeInTheDocument();
  });

  it("shows 'Current Plan' when disabled", () => {
    render(
      <StripeCheckout
        planSlug="solo"
        planName="Solo"
        workspaceId="ws_1"
        priceDisplay="$9/mo"
        disabled
      />
    );
    expect(screen.getByRole("button", { name: "Current Plan" })).toBeDisabled();
  });

  it("calls the create-checkout API on click", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/pay/cs_test_123" }),
    });

    // Mock window.location
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, href: "" },
    });

    render(
      <StripeCheckout
        planSlug="solo"
        planName="Solo"
        workspaceId="ws_1"
        priceDisplay="$9/mo"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Upgrade" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/payments/stripe/create-checkout",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ planSlug: "solo", workspaceId: "ws_1" }),
        })
      );
    });

    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  it("shows error toast when API returns error", async () => {
    const { toast } = await import("sonner");
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Plan not found" }),
    });

    render(
      <StripeCheckout
        planSlug="solo"
        planName="Solo"
        workspaceId="ws_1"
        priceDisplay="$9/mo"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Upgrade" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Plan not found");
    });
  });
});
