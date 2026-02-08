import { getServerSession } from "next-auth"
import { sseConnections } from "@/lib/sse/connections"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await getServerSession()
  const userId = (session?.user as any)?.id

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const writer = {
        write: (data: string) => {
          try {
            controller.enqueue(encoder.encode(data))
          } catch {
            // Stream closed
          }
        },
      }

      sseConnections.set(userId, writer)

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"))
        } catch {
          clearInterval(heartbeat)
        }
      }, 30000)

      // Send initial connection event
      controller.enqueue(encoder.encode("data: {\"type\":\"connected\"}\n\n"))

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        sseConnections.delete(userId)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
