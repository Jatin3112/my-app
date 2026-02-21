import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockUser, createUnverifiedUser, resetIdCounter } from "../../utils/test-helpers";

// Mock db
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      emailVerificationTokens: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({ values: vi.fn() })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
  },
}));

// Mock email
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock tokens
vi.mock("@/lib/api/tokens", () => ({
  generateToken: vi.fn(() => ({ raw: "mock-raw-token", hash: "mock-hash-token" })),
  hashToken: vi.fn((raw: string) => `hashed-${raw}`),
}));

import { sendVerificationEmail, verifyEmail, resendVerificationEmail } from "@/lib/api/email-verification";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

beforeEach(() => {
  vi.clearAllMocks();
  resetIdCounter();
});

describe("sendVerificationEmail", () => {
  it("returns false for non-existent user", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

    const result = await sendVerificationEmail("nonexistent-id");
    expect(result).toBe(false);
  });

  it("returns true without sending email for already-verified user", async () => {
    const user = createMockUser({ email_verified: new Date() });
    vi.mocked(db.query.users.findFirst).mockResolvedValue(user);

    const result = await sendVerificationEmail(user.id);
    expect(result).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("generates token and sends email for unverified user", async () => {
    const user = createUnverifiedUser();
    vi.mocked(db.query.users.findFirst).mockResolvedValue(user);
    const mockValues = vi.fn();
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    const result = await sendVerificationEmail(user.id);

    expect(result).toBe(true);
    expect(db.insert).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: user.email,
        subject: expect.stringContaining("Verify"),
      })
    );
  });
});

describe("verifyEmail", () => {
  it("returns error for non-existent token", async () => {
    vi.mocked(db.query.emailVerificationTokens.findFirst).mockResolvedValue(undefined);

    const result = await verifyEmail("garbage-token");
    expect(result).toEqual({ success: false, error: "Invalid verification link" });
  });

  it("returns error for already-used token", async () => {
    vi.mocked(db.query.emailVerificationTokens.findFirst).mockResolvedValue({
      id: "1",
      user_id: "user-1",
      token_hash: "hash",
      expires_at: new Date(Date.now() + 86400000),
      used_at: new Date(),
      created_at: new Date(),
    });

    const result = await verifyEmail("used-token");
    expect(result).toEqual({ success: false, error: "This link has already been used" });
  });

  it("returns error for expired token", async () => {
    vi.mocked(db.query.emailVerificationTokens.findFirst).mockResolvedValue({
      id: "1",
      user_id: "user-1",
      token_hash: "hash",
      expires_at: new Date(Date.now() - 1000),
      used_at: null,
      created_at: new Date(),
    });

    const result = await verifyEmail("expired-token");
    expect(result).toEqual({ success: false, error: "This link has expired. Please request a new one." });
  });

  it("verifies email and marks token used for valid token", async () => {
    vi.mocked(db.query.emailVerificationTokens.findFirst).mockResolvedValue({
      id: "1",
      user_id: "user-123",
      token_hash: "hash",
      expires_at: new Date(Date.now() + 86400000),
      used_at: null,
      created_at: new Date(),
    });

    const mockWhere1 = vi.fn();
    const mockSet1 = vi.fn(() => ({ where: mockWhere1 }));
    const mockWhere2 = vi.fn();
    const mockSet2 = vi.fn(() => ({ where: mockWhere2 }));

    let callCount = 0;
    vi.mocked(db.update).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { set: mockSet1 } as any;
      return { set: mockSet2 } as any;
    });

    const result = await verifyEmail("valid-token");

    expect(result).toEqual({ success: true });
    expect(db.update).toHaveBeenCalledTimes(2);
  });
});

describe("resendVerificationEmail", () => {
  it("returns true for already-verified user (no action needed)", async () => {
    const user = createMockUser({ email_verified: new Date() });
    vi.mocked(db.query.users.findFirst).mockResolvedValue(user);

    const result = await resendVerificationEmail(user.email);
    expect(result).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
