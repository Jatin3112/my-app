import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import RegisterPage from "@/app/register/page";

describe("RegisterPage", () => {
  it("renders OAuth buttons", () => {
    render(<RegisterPage />);
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("renders divider text", () => {
    render(<RegisterPage />);
    expect(screen.getByText("or sign up with email")).toBeInTheDocument();
  });

  it("renders all form fields", () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
  });

  it("renders create account button", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("renders sign in link", () => {
    render(<RegisterPage />);
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("Sign in").closest("a")).toHaveAttribute("href", "/login");
  });

  it("shows trial description", () => {
    render(<RegisterPage />);
    expect(screen.getByText("Get started with your free 14-day trial")).toBeInTheDocument();
  });
});
