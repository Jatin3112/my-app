interface WelcomeEmailData {
  userName: string;
  loginUrl: string;
}

export function welcomeEmailHtml(data: WelcomeEmailData): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Welcome to VoiceTask, ${data.userName}!</h2>
  <p>Your account is ready. You have a 14-day free trial with full access to all features.</p>
  <p>Here's what you can do:</p>
  <ul>
    <li>Create projects and track todos</li>
    <li>Log timesheet entries with voice capture</li>
    <li>Invite team members to collaborate</li>
  </ul>
  <p style="margin: 24px 0;">
    <a href="${data.loginUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Get Started
    </a>
  </p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #9ca3af; font-size: 12px;">VoiceTask — Project management with AI-powered voice capture</p>
</body>
</html>`;
}
