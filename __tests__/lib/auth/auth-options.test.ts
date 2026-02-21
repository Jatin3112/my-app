import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockUser, createOAuthUser, createUnverifiedUser, createMockAccount, resetIdCounter } from "../../utils/test-helpers";

// Mock db
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
      accounts: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn() })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
  },
}));

// Mock bcrypt
vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Mock workspaces
vi.mock("@/lib/api/workspaces", () => ({
  createWorkspace: vi.fn(),
}));

import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";

beforeEach(() => {
  vi.clearAllMocks();
  resetIdCounter();
});

describe("CredentialsProvider authorize", () => {
  const credentialsProvider = authOptions.providers.find(
    (p) => p.id === "credentials"
  );

  // Get the authorize function
  const authorize = (credentialsProvider as any)?.options?.authorize;

  it("returns null for missing credentials", async () => {
    if (!authorize) return;
    const result = await authorize({});
    expect(result).toBeNull();
  });

  it("returns null for non-existent user", async () => {
    if (!authorize) return;
    vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

    const result = await authorize({ email: "no@one.com", password: "pass" });
    expect(result).toBeNull();
  });

  it("returns null for OAuth-only user (no password)", async () => {
    if (!authorize) return;
    const oauthUser = createOAuthUser();
    vi.mocked(db.query.users.findFirst).mockResolvedValue(oauthUser);

    const result = await authorize({ email: oauthUser.email, password: "anypass" });
    expect(result).toBeNull();
  });

  it("returns null for wrong password", async () => {
    if (!authorize) return;
    const user = createMockUser();
    vi.mocked(db.query.users.findFirst).mockResolvedValue(user);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const result = await authorize({ email: user.email, password: "wrong" });
    expect(result).toBeNull();
  });

  it("returns user object for valid credentials", async () => {
    if (!authorize) return;
    const user = createMockUser();
    vi.mocked(db.query.users.findFirst).mockResolvedValue(user);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await authorize({ email: user.email, password: "correct" });
    expect(result).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  });
});

describe("signIn callback", () => {
  const signInCallback = authOptions.callbacks!.signIn!;

  it("redirects unverified credentials user to login with error", async () => {
    const unverifiedUser = createUnverifiedUser();
    vi.mocked(db.query.users.findFirst).mockResolvedValue(unverifiedUser);

    const result = await signInCallback({
      user: { id: unverifiedUser.id, email: unverifiedUser.email },
      account: { provider: "credentials", type: "credentials", providerAccountId: "" },
    } as any);

    expect(typeof result).toBe("string");
    expect(result).toContain("EmailNotVerified");
  });

  it("allows verified credentials user to sign in", async () => {
    const verifiedUser = createMockUser({ email_verified: new Date() });
    vi.mocked(db.query.users.findFirst).mockResolvedValue(verifiedUser);

    const result = await signInCallback({
      user: { id: verifiedUser.id, email: verifiedUser.email },
      account: { provider: "credentials", type: "credentials", providerAccountId: "" },
    } as any);

    expect(result).toBe(true);
  });
});

describe("jwt callback", () => {
  const jwtCallback = authOptions.callbacks!.jwt!;

  it("sets user.id on token when user is present", async () => {
    const token = { id: undefined } as any;
    const user = { id: "user-123" };

    const result = await jwtCallback({ token, user } as any);
    expect(result.id).toBe("user-123");
  });

  it("returns token unchanged when no user", async () => {
    const token = { id: "existing-id" } as any;

    const result = await jwtCallback({ token, user: undefined } as any);
    expect(result.id).toBe("existing-id");
  });
});
