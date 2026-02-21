import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import ForgotPasswordPage from "@/app/forgot-password/page";

describe("ForgotPasswordPage", () => {
  it("renders page title", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText("Forgot your password?")).toBeInTheDocument();
  });

  it("renders email input", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders send button", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument();
  });

  it("renders back to sign in link", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText("Back to sign in")).toBeInTheDocument();
  });
});
