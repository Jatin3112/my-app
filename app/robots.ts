import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://voicetask.app"

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/billing", "/workspace", "/todos", "/timesheet", "/projects", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
