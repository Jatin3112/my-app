"use server";

import { db } from "@/lib/db";
import { users, emailVerificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateToken, hashToken } from "@/lib/api/tokens";
import { sendEmail } from "@/lib/email";
import { emailVerificationHtml } from "@/lib/email/templates/email-verification";

const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

export async function sendVerificationEmail(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return false;
  }

  if (user.email_verified) {
    return true;
  }

  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await db.insert(emailVerificationTokens).values({
    user_id: user.id,
    token_hash: hash,
    expires_at: expiresAt,
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify-email/${raw}`;

  await sendEmail({
    to: user.email,
    subject: "Verify your email — VoiceTask",
    html: emailVerificationHtml({
      verifyUrl,
      userName: user.name || user.email,
    }),
  });

  return true;
}

export async function verifyEmail(rawToken: string): Promise<{ success: boolean; error?: string }> {
  const hash = hashToken(rawToken);

  const token = await db.query.emailVerificationTokens.findFirst({
    where: eq(emailVerificationTokens.token_hash, hash),
  });

  if (!token) {
    return { success: false, error: "Invalid verification link" };
  }

  if (token.used_at) {
    return { success: false, error: "This link has already been used" };
  }

  if (new Date() > token.expires_at) {
    return { success: false, error: "This link has expired. Please request a new one." };
  }

  await db.update(users).set({
    email_verified: new Date(),
    updated_at: new Date(),
  }).where(eq(users.id, token.user_id));

  await db.update(emailVerificationTokens).set({
    used_at: new Date(),
  }).where(eq(emailVerificationTokens.token_hash, hash));

  return { success: true };
}

export async function resendVerificationEmail(email: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (!user) {
    // Always return true to prevent email enumeration
    return true;
  }

  if (user.email_verified) {
    return true;
  }

  return sendVerificationEmail(user.id);
}
