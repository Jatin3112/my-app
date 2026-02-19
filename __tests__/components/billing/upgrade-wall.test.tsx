import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UpgradeWall } from "@/components/billing/upgrade-wall";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

describe("UpgradeWall", () => {
  it("renders children normally when not blocked", () => {
    render(
      <UpgradeWall isBlocked={false} reason="Plan limit reached">
        <div data-testid="content">Hello</div>
      </UpgradeWall>
    );
    expect(screen.getByTestId("content")).toBeInTheDocument();
    expect(screen.queryByText("Upgrade Required")).not.toBeInTheDocument();
  });

  it("shows lock overlay when blocked", () => {
    render(
      <UpgradeWall isBlocked={true} reason="You've reached your plan limit">
        <div data-testid="content">Hello</div>
      </UpgradeWall>
    );
    expect(screen.getByText("Upgrade Required")).toBeInTheDocument();
    expect(screen.getByText("You've reached your plan limit")).toBeInTheDocument();
    expect(screen.getByText("View Plans")).toBeInTheDocument();
  });

  it("blurs children when blocked", () => {
    render(
      <UpgradeWall isBlocked={true} reason="Limit">
        <div data-testid="content">Hello</div>
      </UpgradeWall>
    );
    const blurred = screen.getByTestId("content").parentElement;
    expect(blurred?.className).toContain("blur");
  });

  it("links to billing page", () => {
    render(
      <UpgradeWall isBlocked={true} reason="Limit">
        <div>Hello</div>
      </UpgradeWall>
    );
    const link = screen.getByText("View Plans").closest("a");
    expect(link).toHaveAttribute("href", "/billing");
  });
});
