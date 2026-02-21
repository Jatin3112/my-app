"use server";

import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { generateToken, hashToken } from "@/lib/api/tokens";
import { sendEmail } from "@/lib/email";
import { passwordResetEmailHtml } from "@/lib/email/templates/password-reset";

const RESET_TOKEN_EXPIRY_HOURS = 1;

export async function requestPasswordReset(email: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (!user) {
    // Always return true to prevent email enumeration
    return true;
  }

  const { raw, hash } = generateToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    user_id: user.id,
    token_hash: hash,
    expires_at: expiresAt,
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password/${raw}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your password — VoiceTask",
    html: passwordResetEmailHtml({
      resetUrl,
      userName: user.name || user.email,
    }),
  });

  return true;
}

export async function validateResetToken(rawToken: string): Promise<{ valid: boolean; userId?: string }> {
  const hash = hashToken(rawToken);

  const token = await db.query.passwordResetTokens.findFirst({
    where: eq(passwordResetTokens.token_hash, hash),
  });

  if (!token) {
    return { valid: false };
  }

  if (token.used_at) {
    return { valid: false };
  }

  if (new Date() > token.expires_at) {
    return { valid: false };
  }

  return { valid: true, userId: token.user_id };
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const { valid, userId } = await validateResetToken(rawToken);

  if (!valid || !userId) {
    return { success: false, error: "Invalid or expired reset link" };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const hash = hashToken(rawToken);

  await db.update(users).set({
    password: hashedPassword,
    email_verified: new Date(),
    updated_at: new Date(),
  }).where(eq(users.id, userId));

  await db.update(passwordResetTokens).set({
    used_at: new Date(),
  }).where(eq(passwordResetTokens.token_hash, hash));

  return { success: true };
}
