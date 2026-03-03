/**
 * Notification utility functions for admin alerts
 */

import { createClient } from "@/lib/supabase/client"

export interface Notification {
  id: string
  admin_id: string
  user_id?: string | null
  type: "task_completed" | "time_exceeded" | "due_date_reminder" | "pto_approved" | "pto_rejected" | "review_published" | "file_shared" | "onboarding_assigned" | "general"
  message: string
  task_id: string | null
  is_read: boolean
  created_at: string
}

/**
 * Create a notification for a specific user (server-side utility)
 */
export async function createNotification(opts: {
    userId?: string
    adminId?: string
    type: Notification["type"]
    message: string
    taskId?: string
}): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient()

    const insertData: Record<string, any> = {
        type: opts.type,
        message: opts.message,
        task_id: opts.taskId || null,
        is_read: false,
    }

    if (opts.userId) insertData.user_id = opts.userId
    if (opts.adminId) insertData.admin_id = opts.adminId

    const { error } = await supabase.from("notifications").insert(insertData)

    if (error) {
        console.error("Error creating notification:", error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)

  if (error) {
    console.error("Error marking notification as read:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Mark all notifications as read for an admin
 */
export async function markAllAsRead(adminId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("admin_id", adminId).eq("is_read", false)

  if (error) {
    console.error("Error marking all notifications as read:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Show a browser notification
 */
function showBrowserNotification(title: string, body: string, icon?: string): void {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications")
    return
  }

  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: icon || "/placeholder-logo.png",
      badge: "/placeholder-logo.png",
      tag: "strataforge-notification",
      requireInteraction: false,
    })
  }
}

/**
 * Subscribe to real-time notifications
 */
export function subscribeToNotifications(
  adminId: string,
  onNotification: (notification: Notification) => void,
): () => void {
  const supabase = createClient()

  const channel = supabase
    .channel("notifications")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `admin_id=eq.${adminId}`,
      },
      (payload) => {
        const notification = payload.new as Notification
        onNotification(notification)

        // Show browser notification if permission granted
        if (Notification.permission === "granted") {
          showBrowserNotification("StrataForge Notification", notification.message)
        }
      },
    )
    .subscribe()

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel)
  }
}
