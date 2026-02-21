import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth-options"
import { createAttachment } from "@/lib/api/attachments"
import { getWorkspaceStorageUsage } from "@/lib/api/attachments"
import { getSubscription, isSubscriptionActive, getPlanLimits } from "@/lib/api/subscriptions"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const workspaceId = formData.get("workspaceId") as string | null
    const todoId = formData.get("todoId") as string | null

    if (!file || !workspaceId || !todoId) {
      return NextResponse.json({ error: "file, workspaceId, and todoId are required" }, { status: 400 })
    }

    // Check storage limits
    const sub = await getSubscription(workspaceId)
    if (sub) {
      const active = await isSubscriptionActive(sub)
      if (active) {
        const limits = await getPlanLimits(sub.plan)
        if (limits.maxStorageMb && limits.maxStorageMb > 0) {
          const currentUsage = await getWorkspaceStorageUsage(workspaceId)
          const maxBytes = limits.maxStorageMb * 1024 * 1024
          if (currentUsage + file.size > maxBytes) {
            return NextResponse.json(
              { error: `Storage limit exceeded. Used: ${Math.round(currentUsage / 1024 / 1024)}MB / ${limits.maxStorageMb}MB` },
              { status: 413 }
            )
          }
        }
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const attachment = await createAttachment(workspaceId, userId, todoId, file.name, file.type, buffer)

    return NextResponse.json(attachment, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
