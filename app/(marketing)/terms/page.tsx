import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "VoiceTask terms of service — the agreement between you and VoiceTask.",
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: February 21, 2026</p>

      <div className="mt-10 space-y-8 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p className="mt-3">
            By accessing or using VoiceTask (&ldquo;the Service&rdquo;), you agree to be bound by these Terms
            of Service. If you do not agree to these terms, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
          <p className="mt-3">
            VoiceTask is a project management and time tracking platform designed for freelancers and small
            agencies. The Service includes task management, timesheet logging, team collaboration, and
            AI-powered voice input features.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Accounts</h2>
          <p className="mt-3">
            You must provide accurate and complete information when creating an account. You are responsible
            for maintaining the security of your account credentials. You must notify us immediately of any
            unauthorized use of your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Subscriptions and Billing</h2>
          <p className="mt-3">
            VoiceTask offers paid subscription plans billed monthly. New workspaces receive a 14-day free
            trial with full features. After the trial period, you must subscribe to a plan to continue
            using the Service.
          </p>
          <p className="mt-3">
            Payments are processed through Razorpay (for INR) and Stripe (for USD). By subscribing, you
            authorize us to charge your payment method on a recurring basis until you cancel.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Cancellation</h2>
          <p className="mt-3">
            You may cancel your subscription at any time from your billing settings. Upon cancellation,
            your subscription remains active until the end of the current billing period. After that,
            your workspace will be restricted to read-only access.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Acceptable Use</h2>
          <p className="mt-3">You agree not to:</p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to any part of the Service</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
            <li>Upload malicious code or content</li>
            <li>Resell or redistribute the Service without permission</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Intellectual Property</h2>
          <p className="mt-3">
            The Service and its original content, features, and functionality are owned by VoiceTask and
            are protected by applicable intellectual property laws. You retain ownership of all data you
            input into the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">8. Data and Privacy</h2>
          <p className="mt-3">
            Your use of the Service is also governed by our Privacy Policy. By using the Service, you
            consent to the collection and use of information as described in our Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">9. Limitation of Liability</h2>
          <p className="mt-3">
            To the maximum extent permitted by law, VoiceTask shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages, or any loss of profits or revenue,
            whether incurred directly or indirectly, arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">10. Changes to Terms</h2>
          <p className="mt-3">
            We reserve the right to modify these terms at any time. We will notify users of material
            changes via email or a notice within the Service. Continued use after changes constitutes
            acceptance of the modified terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">11. Contact</h2>
          <p className="mt-3">
            For questions about these Terms of Service, contact us at legal@voicetask.app.
          </p>
        </section>
      </div>
    </div>
  )
}
