import { describe, it, expect } from "vitest"
import { sanitizeText, sanitizeHtml } from "@/lib/api/sanitize"

describe("sanitizeText", () => {
  it("strips HTML tags", () => {
    expect(sanitizeText('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello')
  })

  it("strips all tags from rich content", () => {
    expect(sanitizeText("<div><p>Hello</p></div>")).toBe("Hello")
  })

  it("preserves plain text", () => {
    expect(sanitizeText("Hello world")).toBe("Hello world")
  })

  it("strips nested tags", () => {
    expect(sanitizeText("<b><i>text</i></b>")).toBe("text")
  })

  it("handles empty string", () => {
    expect(sanitizeText("")).toBe("")
  })

  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello")
  })
})

describe("sanitizeHtml", () => {
  it("strips script tags but keeps safe content", () => {
    expect(sanitizeHtml('<p>Hello</p><script>alert("xss")</script>')).toBe("<p>Hello</p>")
  })

  it("strips event handlers", () => {
    expect(sanitizeHtml('<img onerror="alert(1)" src="x">')).toBe('<img src="x">')
  })

  it("preserves safe HTML", () => {
    expect(sanitizeHtml("<b>Bold</b> and <i>italic</i>")).toBe("<b>Bold</b> and <i>italic</i>")
  })
})
