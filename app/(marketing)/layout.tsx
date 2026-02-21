import type { Metadata } from "next"
import { Navbar } from "@/components/marketing/navbar"
import { Footer } from "@/components/marketing/footer"

export const metadata: Metadata = {
  title: {
    default: "VoiceTask — AI-Powered Project Management",
    template: "%s | VoiceTask",
  },
  description:
    "Voice-powered project management for freelancers and small agencies. Speak your tasks, timesheets, and todos — AI handles the rest.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://voicetask.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "VoiceTask",
    title: "VoiceTask — AI-Powered Project Management",
    description:
      "Voice-powered project management for freelancers and small agencies. Speak your tasks, timesheets, and todos — AI handles the rest.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "VoiceTask — Manage Projects with Your Voice",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VoiceTask — AI-Powered Project Management",
    description:
      "Voice-powered project management for freelancers and small agencies. Speak your tasks, timesheets, and todos — AI handles the rest.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "VoiceTask",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Voice-powered project management for freelancers and small agencies. Speak your tasks, timesheets, and todos — AI handles the rest.",
    offers: [
      {
        "@type": "Offer",
        name: "Solo",
        price: "9",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        name: "Team",
        price: "19",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        name: "Agency",
        price: "35",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "120",
    },
  }

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
