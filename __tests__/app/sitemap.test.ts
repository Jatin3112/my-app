import { describe, it, expect } from "vitest"
import sitemap from "@/app/sitemap"

describe("sitemap", () => {
  it("returns all marketing pages", () => {
    const result = sitemap()
    const urls = result.map((entry) => entry.url)

    expect(urls.some((u) => u.includes("/pricing"))).toBe(true)
    expect(urls.some((u) => u.includes("/privacy"))).toBe(true)
    expect(urls.some((u) => u.includes("/terms"))).toBe(true)
    expect(urls.some((u) => u.includes("/refund"))).toBe(true)
  })

  it("sets homepage as highest priority", () => {
    const result = sitemap()
    const homepage = result.find((entry) => entry.priority === 1)

    expect(homepage).toBeDefined()
    expect(homepage!.priority).toBe(1)
  })

  it("includes lastModified on all entries", () => {
    const result = sitemap()

    for (const entry of result) {
      expect(entry.lastModified).toBeDefined()
    }
  })
})
