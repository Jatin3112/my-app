import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "VoiceTask privacy policy — how we collect, use, and protect your data.",
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: February 21, 2026</p>

      <div className="mt-10 space-y-8 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
          <p className="mt-3">
            We collect information you provide directly to us when you create an account, use our services,
            or communicate with us. This includes your name, email address, and workspace data such as
            projects, tasks, and timesheet entries.
          </p>
          <p className="mt-3">
            When you use our voice capture feature, audio is processed in your browser using the Web Speech API
            or sent to our AI parsing service. We do not store raw audio recordings. Only the transcribed and
            parsed text is stored as part of your task or timesheet data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
          <p className="mt-3">We use the information we collect to:</p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send you technical notices, updates, and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Monitor and analyze trends, usage, and activities</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Data Storage and Security</h2>
          <p className="mt-3">
            Your data is stored securely in our PostgreSQL database. We use industry-standard encryption
            for data in transit (TLS/SSL) and follow security best practices for data at rest. Passwords
            are hashed using bcrypt and are never stored in plaintext.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Data Sharing</h2>
          <p className="mt-3">
            We do not sell your personal information. We may share your information only in the following
            circumstances:
          </p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>With your consent or at your direction</li>
            <li>With service providers who assist in our operations (payment processors, email delivery)</li>
            <li>To comply with legal obligations or protect our rights</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Third-Party Services</h2>
          <p className="mt-3">
            We use the following third-party services that may process your data:
          </p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Razorpay and Stripe for payment processing</li>
            <li>Google and GitHub for OAuth authentication</li>
            <li>OpenAI for AI-powered voice parsing</li>
          </ul>
          <p className="mt-3">
            Each of these services operates under their own privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Your Rights</h2>
          <p className="mt-3">You have the right to:</p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data in a machine-readable format</li>
            <li>Withdraw consent for data processing</li>
          </ul>
          <p className="mt-3">
            To exercise these rights, contact us at privacy@voicetask.app.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Cookies</h2>
          <p className="mt-3">
            We use essential cookies for authentication and session management. We do not use
            third-party tracking cookies. Analytics, if enabled, use privacy-respecting tools.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">8. Changes to This Policy</h2>
          <p className="mt-3">
            We may update this privacy policy from time to time. We will notify you of any changes
            by updating the &ldquo;Last updated&rdquo; date at the top of this page.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">9. Contact Us</h2>
          <p className="mt-3">
            If you have questions about this privacy policy, please contact us at privacy@voicetask.app.
          </p>
        </section>
      </div>
    </div>
  )
}
