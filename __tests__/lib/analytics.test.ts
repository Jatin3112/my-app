// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY
})

import { trackEvent, identifyUser } from "@/lib/analytics"

describe("analytics", () => {
  it("no-ops trackEvent when PostHog key is not set", () => {
    expect(() => trackEvent("test_event", {})).not.toThrow()
  })

  it("no-ops identifyUser when PostHog key is not set", () => {
    expect(() => identifyUser("u1", { email: "a@b.com" })).not.toThrow()
  })
})
