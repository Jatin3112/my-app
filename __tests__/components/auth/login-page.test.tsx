import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({
    get: vi.fn((key: string) => {
      if (key === "error") return null;
      if (key === "email") return null;
      if (key === "invite") return null;
      return null;
    }),
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import LoginPage from "@/app/login/page";

describe("LoginPage", () => {
  it("renders OAuth buttons", () => {
    render(<LoginPage />);
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("renders divider text", () => {
    render(<LoginPage />);
    expect(screen.getByText("or continue with email")).toBeInTheDocument();
  });

  it("renders email and password fields", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders forgot password link", () => {
    render(<LoginPage />);
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
    expect(screen.getByText("Forgot password?").closest("a")).toHaveAttribute("href", "/forgot-password");
  });

  it("renders sign up link", () => {
    render(<LoginPage />);
    expect(screen.getByText("Sign up")).toBeInTheDocument();
    expect(screen.getByText("Sign up").closest("a")).toHaveAttribute("href", "/register");
  });

  it("renders sign in button", () => {
    render(<LoginPage />);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});
