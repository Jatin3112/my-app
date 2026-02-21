interface PasswordResetEmailData {
  resetUrl: string;
  userName: string;
}

export function passwordResetEmailHtml(data: PasswordResetEmailData): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Reset your password</h2>
  <p>Hi ${data.userName},</p>
  <p>We received a request to reset your password. Click the button below to choose a new one.</p>
  <p style="margin: 24px 0;">
    <a href="${data.resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Reset Password
    </a>
  </p>
  <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #9ca3af; font-size: 12px;">VoiceTask — Project management with AI-powered voice capture</p>
</body>
</html>`;
}
