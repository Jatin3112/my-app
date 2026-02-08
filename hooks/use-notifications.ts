"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useWorkspace } from "@/hooks/use-workspace"
import { getNotifications, markAsRead, markAllAsRead } from "@/lib/api/notifications"

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

const POLL_INTERVAL = 30000 // 30 seconds

export function useNotifications() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  const { currentWorkspace } = useWorkspace()
  const workspaceId = currentWorkspace?.id

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const loadNotifications = useCallback(async () => {
    if (!userId || !workspaceId) return
    try {
      const data = await getNotifications(userId, workspaceId, { limit: 50 })
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.is_read).length)
    } catch (error) {
      console.error("Failed to load notifications:", error)
    }
  }, [userId, workspaceId])

  // Initial load + polling
  useEffect(() => {
    loadNotifications()

    // Poll for new notifications
    intervalRef.current = setInterval(loadNotifications, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
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
