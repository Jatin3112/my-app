import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "test-token-123" }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import ResetPasswordPage from "@/app/reset-password/[token]/page";

describe("ResetPasswordPage", () => {
  it("renders password form", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText("Reset your password")).toBeInTheDocument();
  });

  it("renders password fields", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
  });

  it("renders reset button", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByRole("button", { name: "Reset password" })).toBeInTheDocument();
  });
});
