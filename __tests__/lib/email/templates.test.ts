import { describe, it, expect } from "vitest";
import { inviteEmailHtml } from "@/lib/email/templates/invite";
import { trialExpiryEmailHtml } from "@/lib/email/templates/trial-expiry";
import { welcomeEmailHtml } from "@/lib/email/templates/welcome";
import { paymentReceiptEmailHtml } from "@/lib/email/templates/payment-receipt";

describe("inviteEmailHtml", () => {
  it("renders with workspace name, inviter, role, and accept link", () => {
    const html = inviteEmailHtml({
      workspaceName: "Acme Corp",
      inviterName: "Jane",
      acceptUrl: "http://localhost:3000/invite/abc123",
      role: "member",
    });
    expect(html).toContain("Acme Corp");
    expect(html).toContain("Jane");
    expect(html).toContain("http://localhost:3000/invite/abc123");
    expect(html).toContain("member");
    expect(html).toContain("Accept Invitation");
  });
});

describe("trialExpiryEmailHtml", () => {
  it("renders with days remaining", () => {
    const html = trialExpiryEmailHtml({
      workspaceName: "Acme Corp",
      daysRemaining: 3,
      billingUrl: "http://localhost:3000/billing",
    });
    expect(html).toContain("3 days");
    expect(html).toContain("Acme Corp");
    expect(html).toContain("http://localhost:3000/billing");
  });

  it("renders expired state when 0 days", () => {
    const html = trialExpiryEmailHtml({
      workspaceName: "Acme Corp",
      daysRemaining: 0,
      billingUrl: "http://localhost:3000/billing",
    });
    expect(html).toContain("expired");
  });
});

describe("welcomeEmailHtml", () => {
  it("renders with user name and login link", () => {
    const html = welcomeEmailHtml({
      userName: "John",
      loginUrl: "http://localhost:3000/login",
    });
    expect(html).toContain("John");
    expect(html).toContain("http://localhost:3000/login");
    expect(html).toContain("Get Started");
  });
});

describe("paymentReceiptEmailHtml", () => {
  it("renders with payment details", () => {
    const html = paymentReceiptEmailHtml({
      planName: "Team",
      amount: "$19.00",
      date: "Feb 20, 2026",
      billingUrl: "http://localhost:3000/billing",
    });
    expect(html).toContain("Team");
    expect(html).toContain("$19.00");
    expect(html).toContain("Feb 20, 2026");
    expect(html).toContain("View Billing");
  });
});
