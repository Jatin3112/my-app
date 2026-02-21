import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for freelancers and agencies. Start with a 14-day free trial. Plans from ₹499/mo or $9/mo.",
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
