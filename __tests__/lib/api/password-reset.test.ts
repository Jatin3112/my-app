import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockUser, resetIdCounter } from "../../utils/test-helpers";

// Mock db
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      passwordResetTokens: { findFirst: vi.fn() },
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

// Mock bcrypt
vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$10$newhash"),
    compare: vi.fn(),
  },
}));

import { requestPasswordReset, validateResetToken, resetPassword } from "@/lib/api/password-reset";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { hashToken } from "@/lib/api/tokens";

beforeEach(() => {
  vi.clearAllMocks();
  resetIdCounter();
});

describe("requestPasswordReset", () => {
  it("returns true even when user is not found (enumeration prevention)", async () => {
    vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

    const result = await requestPasswordReset("nonexistent@example.com");
    expect(result).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("generates token and sends email when user exists", async () => {
    const user = createMockUser();
    vi.mocked(db.query.users.findFirst).mockResolvedValue(user);
    const mockValues = vi.fn();
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    const result = await requestPasswordReset(user.email);

    expect(result).toBe(true);
    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: user.email,
        subject: expect.stringContaining("Reset"),
      })
    );
  });
});

describe("validateResetToken", () => {
  it("returns invalid for non-existent token", async () => {
    vi.mocked(db.query.passwordResetTokens.findFirst).mockResolvedValue(undefined);

    const result = await validateResetToken("garbage-token");
    expect(result).toEqual({ valid: false });
  });

  it("returns invalid for already-used token", async () => {
    vi.mocked(db.query.passwordResetTokens.findFirst).mockResolvedValue({
      id: "1",
      user_id: "user-1",
      token_hash: "hash",
      expires_at: new Date(Date.now() + 3600000),
      used_at: new Date(),
      created_at: new Date(),
    });

    const result = await validateResetToken("used-token");
    expect(result).toEqual({ valid: false });
  });

  it("returns invalid for expired token", async () => {
    vi.mocked(db.query.passwordResetTokens.findFirst).mockResolvedValue({
      id: "1",
      user_id: "user-1",
      token_hash: "hash",
      expires_at: new Date(Date.now() - 1000),
      used_at: null,
      created_at: new Date(),
    });

    const result = await validateResetToken("expired-token");
    expect(result).toEqual({ valid: false });
  });

  it("returns valid with userId for valid token", async () => {
    vi.mocked(db.query.passwordResetTokens.findFirst).mockResolvedValue({
      id: "1",
      user_id: "user-123",
      token_hash: "hash",
      expires_at: new Date(Date.now() + 3600000),
      used_at: null,
      created_at: new Date(),
    });

    const result = await validateResetToken("valid-token");
    expect(result).toEqual({ valid: true, userId: "user-123" });
  });
});

describe("resetPassword", () => {
  it("returns error for invalid token", async () => {
    vi.mocked(db.query.passwordResetTokens.findFirst).mockResolvedValue(undefined);

    const result = await resetPassword("invalid-token", "newpassword123");
    expect(result).toEqual({ success: false, error: "Invalid or expired reset link" });
  });

  it("updates password and marks token used for valid token", async () => {
    vi.mocked(db.query.passwordResetTokens.findFirst).mockResolvedValue({
      id: "1",
      user_id: "user-123",
      token_hash: "hash",
      expires_at: new Date(Date.now() + 3600000),
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

    const result = await resetPassword("valid-token", "newpassword123");

    expect(result).toEqual({ success: true });
    expect(db.update).toHaveBeenCalledTimes(2);
    // First call updates user password
    expect(mockSet1).toHaveBeenCalledWith(
      expect.objectContaining({ password: "$2b$10$newhash" })
    );
    // Second call marks token as used
    expect(mockSet2).toHaveBeenCalledWith(
      expect.objectContaining({ used_at: expect.any(Date) })
    );
  });
});
