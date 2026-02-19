interface InviteEmailData {
  workspaceName: string;
  inviterName: string;
  acceptUrl: string;
  role: string;
}

export function inviteEmailHtml(data: InviteEmailData): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>You've been invited to ${data.workspaceName}</h2>
  <p>${data.inviterName} has invited you to join <strong>${data.workspaceName}</strong> as a <strong>${data.role}</strong>.</p>
  <p style="margin: 24px 0;">
    <a href="${data.acceptUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Accept Invitation
    </a>
  </p>
  <p style="color: #6b7280; font-size: 14px;">This invitation expires in 7 days. If you didn't expect this, you can safely ignore it.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #9ca3af; font-size: 12px;">VoiceTask — Project management with AI-powered voice capture</p>
</body>
</html>`;
}
