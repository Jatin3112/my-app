export function validateOrigin(headers: Headers): boolean {
  const allowedOrigin = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const allowedHost = new URL(allowedOrigin).host

  const origin = headers.get("origin")
  if (origin) {
    try {
      return new URL(origin).host === allowedHost
    } catch {
      return false
    }
  }

  const referer = headers.get("referer")
  if (referer) {
    try {
      return new URL(referer).host === allowedHost
    } catch {
      return false
    }
  }

  // No origin or referer — same-origin requests
  return true
}
