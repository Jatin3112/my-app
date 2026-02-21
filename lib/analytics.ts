import posthog from "posthog-js"

let initialized = false

export function initAnalytics(): void {
  if (initialized) return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: false,
  })
  initialized = true
}

export function trackEvent(name: string, properties?: Record<string, any>): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  initAnalytics()
  posthog.capture(name, properties)
}

export function identifyUser(userId: string, traits?: Record<string, any>): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  initAnalytics()
  posthog.identify(userId, traits)
}
