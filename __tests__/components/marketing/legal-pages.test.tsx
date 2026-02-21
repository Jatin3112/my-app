import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import PrivacyPage from "@/app/(marketing)/privacy/page"
import TermsPage from "@/app/(marketing)/terms/page"
import RefundPage from "@/app/(marketing)/refund/page"

describe("PrivacyPage", () => {
  it("renders the privacy policy main heading", () => {
    render(<PrivacyPage />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Privacy Policy")
  })

  it("displays the last updated date", () => {
    render(<PrivacyPage />)
    expect(screen.getByText(/Last updated: February 21, 2026/)).toBeInTheDocument()
  })

  it("renders all required sections", () => {
    render(<PrivacyPage />)
    expect(screen.getByText(/1. Information We Collect/)).toBeInTheDocument()
    expect(screen.getByText(/2. How We Use Your Information/)).toBeInTheDocument()
    expect(screen.getByText(/3. Data Storage and Security/)).toBeInTheDocument()
    expect(screen.getByText(/4. Data Sharing/)).toBeInTheDocument()
    expect(screen.getByText(/5. Third-Party Services/)).toBeInTheDocument()
    expect(screen.getByText(/6. Your Rights/)).toBeInTheDocument()
    expect(screen.getByText(/7. Cookies/)).toBeInTheDocument()
    expect(screen.getByText(/8. Changes to This Policy/)).toBeInTheDocument()
    expect(screen.getByText(/9. Contact Us/)).toBeInTheDocument()
  })

  it("mentions voice data handling and no raw audio storage", () => {
    render(<PrivacyPage />)
    expect(screen.getByText(/do not store raw audio/)).toBeInTheDocument()
    expect(screen.getByText(/Web Speech API/)).toBeInTheDocument()
  })

  it("lists data usage purposes", () => {
    render(<PrivacyPage />)
    expect(screen.getByText(/Provide, maintain, and improve our services/)).toBeInTheDocument()
    expect(screen.getByText(/Process transactions and send related information/)).toBeInTheDocument()
  })

  it("mentions third-party services used", () => {
    render(<PrivacyPage />)
    expect(screen.getByText(/Razorpay and Stripe/)).toBeInTheDocument()
    expect(screen.getByText(/Google and GitHub/)).toBeInTheDocument()
    expect(screen.getByText(/OpenAI/)).toBeInTheDocument()
  })

  it("lists user rights", () => {
    render(<PrivacyPage />)
    expect(screen.getByText(/Access the personal data we hold about you/)).toBeInTheDocument()
    expect(screen.getByText(/Request deletion of your data/)).toBeInTheDocument()
    expect(screen.getByText(/Export your data in a machine-readable format/)).toBeInTheDocument()
  })

  it("provides privacy contact email", () => {
    render(<PrivacyPage />)
    const matches = screen.getAllByText(/privacy@voicetask.app/)
    expect(matches.length).toBeGreaterThan(0)
  })

  it("mentions security measures including bcrypt", () => {
    render(<PrivacyPage />)
    expect(screen.getByText(/bcrypt/)).toBeInTheDocument()
    expect(screen.getByText(/TLS\/SSL/)).toBeInTheDocument()
  })
})

describe("TermsPage", () => {
  it("renders the terms of service main heading", () => {
    render(<TermsPage />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Terms of Service")
  })

  it("displays the last updated date", () => {
    render(<TermsPage />)
    expect(screen.getByText(/Last updated: February 21, 2026/)).toBeInTheDocument()
  })

  it("renders all required sections", () => {
    render(<TermsPage />)
    expect(screen.getByText(/1. Acceptance of Terms/)).toBeInTheDocument()
    expect(screen.getByText(/2. Description of Service/)).toBeInTheDocument()
    expect(screen.getByText(/3. Accounts/)).toBeInTheDocument()
    expect(screen.getByText(/4. Subscriptions and Billing/)).toBeInTheDocument()
    expect(screen.getByText(/5. Cancellation/)).toBeInTheDocument()
    expect(screen.getByText(/6. Acceptable Use/)).toBeInTheDocument()
    expect(screen.getByText(/7. Intellectual Property/)).toBeInTheDocument()
    expect(screen.getByText(/8. Data and Privacy/)).toBeInTheDocument()
    expect(screen.getByText(/9. Limitation of Liability/)).toBeInTheDocument()
    expect(screen.getByText(/10. Changes to Terms/)).toBeInTheDocument()
    expect(screen.getByText(/11. Contact/)).toBeInTheDocument()
  })

  it("mentions 14-day free trial with full features", () => {
    render(<TermsPage />)
    expect(screen.getByText(/14-day free trial/)).toBeInTheDocument()
  })

  it("mentions subscription and cancellation details", () => {
    render(<TermsPage />)
    expect(screen.getByText(/paid subscription plans billed monthly/)).toBeInTheDocument()
    expect(screen.getByText(/subscription remains active until the end of the current billing period/)).toBeInTheDocument()
  })

  it("lists payment processors", () => {
    render(<TermsPage />)
    expect(screen.getByText(/Razorpay.*INR/)).toBeInTheDocument()
    expect(screen.getByText(/Stripe.*USD/)).toBeInTheDocument()
  })

  it("describes service purpose", () => {
    render(<TermsPage />)
    expect(screen.getByText(/project management and time tracking platform/)).toBeInTheDocument()
    expect(screen.getByText(/freelancers and small agencies/)).toBeInTheDocument()
  })

  it("lists acceptable use restrictions", () => {
    render(<TermsPage />)
    expect(screen.getByText(/Use the Service for any unlawful purpose/)).toBeInTheDocument()
    expect(screen.getByText(/Attempt to gain unauthorized access/)).toBeInTheDocument()
  })

  it("provides legal contact email", () => {
    render(<TermsPage />)
    expect(screen.getByText(/legal@voicetask.app/)).toBeInTheDocument()
  })

  it("references privacy policy", () => {
    render(<TermsPage />)
    expect(screen.getByText(/Privacy Policy/)).toBeInTheDocument()
  })
})

describe("RefundPage", () => {
  it("renders the refund policy main heading", () => {
    render(<RefundPage />)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Refund Policy")
  })

  it("displays the last updated date", () => {
    render(<RefundPage />)
    expect(screen.getByText(/Last updated: February 21, 2026/)).toBeInTheDocument()
  })

  it("renders all required sections", () => {
    render(<RefundPage />)
    expect(screen.getByText(/1. Free Trial/)).toBeInTheDocument()
    expect(screen.getByText(/2. Subscription Refunds/)).toBeInTheDocument()
    expect(screen.getByText(/3. Cancellation/)).toBeInTheDocument()
    expect(screen.getByText(/4. Duplicate Payments/)).toBeInTheDocument()
    expect(screen.getByText(/5. Downgrade Refunds/)).toBeInTheDocument()
    expect(screen.getByText(/6. How to Request a Refund/)).toBeInTheDocument()
    expect(screen.getByText(/7. Processing Time/)).toBeInTheDocument()
  })

  it("mentions the 14-day free trial with full features", () => {
    render(<RefundPage />)
    expect(screen.getByText(/14-day free trial/)).toBeInTheDocument()
    expect(screen.getByText(/access to all features/)).toBeInTheDocument()
  })

  it("explains no payment info needed for trial", () => {
    render(<RefundPage />)
    expect(screen.getByText(/No payment information is required to start a trial/)).toBeInTheDocument()
  })

  it("provides refund request contact email", () => {
    render(<RefundPage />)
    expect(screen.getByText(/billing@voicetask.app/)).toBeInTheDocument()
  })

  it("specifies refund response time", () => {
    render(<RefundPage />)
    expect(screen.getByText(/respond within 3 business days/)).toBeInTheDocument()
  })

  it("specifies refund processing time", () => {
    render(<RefundPage />)
    expect(screen.getByText(/within 5-10 business days/)).toBeInTheDocument()
  })

  it("describes cancellation policy", () => {
    render(<RefundPage />)
    expect(screen.getByText(/subscription remains active until the end of the current billing period/)).toBeInTheDocument()
    expect(screen.getByText(/No partial refunds are provided for unused time/)).toBeInTheDocument()
  })

  it("explains duplicate payment refund process", () => {
    render(<RefundPage />)
    expect(screen.getByText(/charged twice for the same subscription period due to a technical error/)).toBeInTheDocument()
  })

  it("describes downgrade refund policy", () => {
    render(<RefundPage />)
    expect(screen.getByText(/new pricing takes effect at the start of your next billing period/)).toBeInTheDocument()
  })
})
