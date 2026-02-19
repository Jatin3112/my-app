import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { trialExpiryEmailHtml } from "@/lib/email/templates/trial-expiry";

const WARNING_DAYS = [4, 2, 1, 0];

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trialingSubs = await db.query.subscriptions.findMany({
    where: (s, { eq }) => eq(s.status, "trialing"),
    with: {
      workspace: {
        with: {
          owner: true,
        },
      },
    },
  });

  let processed = 0;
  let emailsSent = 0;

  for (const sub of trialingSubs) {
    processed++;

    if (!sub.trial_end) continue;

    const now = new Date();
    const diffMs = sub.trial_end.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    if (!WARNING_DAYS.includes(daysRemaining)) continue;

    const ownerEmail = sub.workspace?.owner?.email;
    if (!ownerEmail) continue;

    const workspaceName = sub.workspace?.name ?? "Your workspace";
    const billingUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/billing`;

    const html = trialExpiryEmailHtml({
      workspaceName,
      daysRemaining,
      billingUrl,
    });

    const subject =
      daysRemaining <= 0
        ? `Your trial for ${workspaceName} has expired`
        : `Your trial for ${workspaceName} ends in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`;

    const sent = await sendEmail({ to: ownerEmail, subject, html });
    if (sent) emailsSent++;
  }

  return NextResponse.json({ status: "ok", processed, emailsSent });
}
