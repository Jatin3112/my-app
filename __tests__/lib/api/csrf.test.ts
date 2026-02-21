import { describe, it, expect, beforeEach } from "vitest"

beforeEach(() => {
  process.env.NEXTAUTH_URL = "http://localhost:3000"
})

import { validateOrigin } from "@/lib/api/csrf"

describe("validateOrigin", () => {
  it("allows requests with matching origin", () => {
    const headers = new Headers({ Origin: "http://localhost:3000" })
    expect(validateOrigin(headers)).toBe(true)
  })

  it("blocks requests with mismatched origin", () => {
    const headers = new Headers({ Origin: "http://evil.com" })
    expect(validateOrigin(headers)).toBe(false)
  })

  it("allows requests with no origin (same-origin navigation)", () => {
    const headers = new Headers()
    expect(validateOrigin(headers)).toBe(true)
  })

  it("falls back to referer when origin is missing", () => {
    const headers = new Headers({ Referer: "http://localhost:3000/some-page" })
    expect(validateOrigin(headers)).toBe(true)
  })

  it("blocks mismatched referer", () => {
    const headers = new Headers({ Referer: "http://evil.com/attack" })
    expect(validateOrigin(headers)).toBe(false)
  })
})
