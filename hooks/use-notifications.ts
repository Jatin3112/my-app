"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useWorkspace } from "@/hooks/use-workspace"
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "@/lib/api/notifications"

type Notification = {
  id: string
  workspace_id: string
  recipient_id: string
  actor_id: string | null
  type: string
  entity_type: string
  entity_id: string | null
  message: string
  is_read: boolean
  created_at: Date
}

export function useNotifications() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const retryCountRef = useRef(0)

  const loadNotifications = useCallback(async () => {
    if (!userId || !workspaceId) return
    try {
      const [data, count] = await Promise.all([
        getNotifications(userId, workspaceId, { limit: 50 }),
        getUnreadCount(userId, workspaceId),
      ])
      setNotifications(data)
      setUnreadCount(count)
    } catch (error) {
      console.error("Failed to load notifications:", error)
    }
  }, [userId, workspaceId])

  // SSE connection
  useEffect(() => {
    if (!userId) return

    function connect() {
      const es = new EventSource("/api/notifications/stream")
      eventSourceRef.current = es

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "connected") return

          // New notification received — refresh
          if (data.workspace_id === workspaceId) {
            setNotifications((prev) => [data, ...prev])
            setUnreadCount((prev) => prev + 1)
          }
        } catch {}
      }

      es.onerror = () => {
        es.close()
        eventSourceRef.current = null
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000)
        retryCountRef.current++
        retryTimeoutRef.current = setTimeout(connect, delay)
      }

      es.onopen = () => {
        retryCountRef.current = 0
      }
    }

    connect()

    return () => {
      eventSourceRef.current?.close()
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    }
  }, [userId, workspaceId])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  async function handleMarkAsRead(notificationId: string) {
    if (!userId) return
    await markAsRead(notificationId, userId)
    setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, is_read: true } : n))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  async function handleMarkAllAsRead() {
    if (!userId || !workspaceId) return
    await markAllAsRead(userId, workspaceId)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  return {
    notifications,
    unreadCount,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    refresh: loadNotifications,
  }
}
