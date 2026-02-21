import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "VoiceTask refund policy — our commitment to fair billing.",
}

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Refund Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: February 21, 2026</p>

      <div className="mt-10 space-y-8 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Free Trial</h2>
          <p className="mt-3">
            All new workspaces receive a 14-day free trial with access to all features. No payment
            information is required to start a trial. If you decide VoiceTask is not for you, simply
            do not subscribe — there is nothing to refund.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Subscription Refunds</h2>
          <p className="mt-3">
            Since we offer a generous free trial, we generally do not provide refunds for subscription
            payments. However, we handle refund requests on a case-by-case basis. If you believe you
            were charged in error or have extenuating circumstances, please contact us.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Cancellation</h2>
          <p className="mt-3">
            You may cancel your subscription at any time. When you cancel, your subscription remains
            active until the end of the current billing period. You will not be charged for subsequent
            periods. No partial refunds are provided for unused time within a billing period.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Duplicate Payments</h2>
          <p className="mt-3">
            If you are charged twice for the same subscription period due to a technical error,
            we will promptly refund the duplicate payment. Please contact our support team with
            your payment details.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Downgrade Refunds</h2>
          <p className="mt-3">
            When you downgrade your plan, the new pricing takes effect at the start of your next
            billing period. No refund or credit is provided for the difference in the current period.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. How to Request a Refund</h2>
          <p className="mt-3">
            To request a refund, email us at billing@voicetask.app with your account email, workspace
            name, and the reason for your request. We will respond within 3 business days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Processing Time</h2>
          <p className="mt-3">
            Approved refunds are processed within 5-10 business days. The refund will be credited
            to the original payment method used for the transaction.
          </p>
        </section>
      </div>
    </div>
  )
}
