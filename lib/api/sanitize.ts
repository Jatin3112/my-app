/**
 * Strips all HTML tags from text. Use for plain-text fields like
 * todo titles, project names, workspace names.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .trim()
}

/**
 * Strips dangerous HTML (scripts, event handlers) but preserves safe tags.
 * Use for rich-text fields like comments.
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s*on\w+\s*=\s*'[^']*'/gi, "")
    .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, "")
    .replace(/<object\b[^>]*>.*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .trim()
}
