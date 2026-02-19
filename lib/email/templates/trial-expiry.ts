interface TrialExpiryEmailData {
  workspaceName: string;
  daysRemaining: number;
  billingUrl: string;
}

export function trialExpiryEmailHtml(data: TrialExpiryEmailData): string {
  const isExpired = data.daysRemaining <= 0;
  const headline = isExpired
    ? `Your trial for ${data.workspaceName} has expired`
    : `Your trial for ${data.workspaceName} ends in ${data.daysRemaining} days`;

  const message = isExpired
    ? "Your free trial has expired. Upgrade now to continue using all features."
    : `You have ${data.daysRemaining} days left on your free trial. Upgrade to keep access to all features.`;

  return `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>${headline}</h2>
  <p>${message}</p>
  <p style="margin: 24px 0;">
    <a href="${data.billingUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      View Plans &amp; Upgrade
    </a>
  </p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #9ca3af; font-size: 12px;">VoiceTask — Project management with AI-powered voice capture</p>
</body>
</html>`;
}
