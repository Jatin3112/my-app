interface PaymentReceiptEmailData {
  planName: string;
  amount: string;
  date: string;
  billingUrl: string;
}

export function paymentReceiptEmailHtml(data: PaymentReceiptEmailData): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Payment Receipt</h2>
  <p>Thank you for your payment! Here are the details:</p>
  <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Plan</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${data.planName}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Amount</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${data.amount}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Date</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.date}</td>
    </tr>
  </table>
  <p style="margin: 24px 0;">
    <a href="${data.billingUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      View Billing
    </a>
  </p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="color: #9ca3af; font-size: 12px;">VoiceTask — Project management with AI-powered voice capture</p>
</body>
</html>`;
}
