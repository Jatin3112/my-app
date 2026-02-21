import { describe, it, expect } from "vitest"
import robots from "@/app/robots"

describe("robots", () => {
  it("allows public pages", () => {
    const result = robots()

    expect(result.rules).toBeDefined()
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules
    expect(rules.allow).toBe("/")
  })

  it("disallows app routes", () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules
    const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow]

    expect(disallowed).toContain("/dashboard")
    expect(disallowed).toContain("/api/")
    expect(disallowed).toContain("/billing")
  })

  it("includes sitemap URL", () => {
    const result = robots()

    expect(result.sitemap).toContain("/sitemap.xml")
  })
})
