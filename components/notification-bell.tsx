"use client"

import { useEffect, useState } from "react"
import { Bell, X, CheckCircle, AlertTriangle, Clock } from "lucide-react"
import { subscribeToNotifications } from "@/lib/notification-utils"
import type { Notification } from "@/lib/notification-utils"

interface NotificationBellProps {
    userId: string
    isAdmin: boolean
}

export function NotificationBell({ userId, isAdmin }: NotificationBellProps) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isAdmin) return

        // Load initial notifications
        loadNotifications()

        // Subscribe to real-time notifications
        const unsubscribe = subscribeToNotifications(userId, (notification) => {
            setNotifications((prev) => [notification, ...prev])
        })

        return () => {
            unsubscribe()
        }
    }, [userId, isAdmin])

    const loadNotifications = async () => {
        try {
            const response = await fetch(`/api/admin/notifications?adminId=${userId}`)
            const data = await response.json()
            setNotifications(data || [])
        } catch (error) {
            console.error("Error loading notifications:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await fetch("/api/admin/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId }),
            })

            setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))
        } catch (error) {
            console.error("Error marking notification as read:", error)
        }
    }

    const handleMarkAllAsRead = async () => {
        try {
            await fetch("/api/admin/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminId: userId, markAllRead: true }),
            })

            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        } catch (error) {
            console.error("Error marking all as read:", error)
        }
    }

    const getNotificationIcon = (type: Notification["type"]) => {
        switch (type) {
            case "task_completed":
                return <CheckCircle className="w-5 h-5 text-green-600" />
            case "time_exceeded":
                return <AlertTriangle className="w-5 h-5 text-red-600" />
            case "due_date_reminder":
                return <Clock className="w-5 h-5 text-amber-600" />
            default:
                return <Bell className="w-5 h-5 text-blue-600" />
        }
    }

    const getNotificationColor = (type: Notification["type"]) => {
        switch (type) {
            case "task_completed":
                return "bg-green-50 border-green-200 hover:bg-green-100"
            case "time_exceeded":
                return "bg-red-50 border-red-200 hover:bg-red-100"
            case "due_date_reminder":
                return "bg-amber-50 border-amber-200 hover:bg-amber-100"
            default:
                return "bg-blue-50 border-blue-200 hover:bg-blue-100"
        }
    }

    const unreadCount = notifications.filter((n) => !n.is_read).length

    if (!isAdmin) return null

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                title="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Notifications Panel */}
                    <div className="absolute right-0 mt-2 w-96 max-h-[32rem] bg-white rounded-lg shadow-xl border border-border z-50 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-blue-50 to-blue-100">
                            <h3 className="font-semibold text-lg">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/50 rounded">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto max-h-[28rem]">
                            {loading ? (
                                <div className="p-8 text-center text-muted-foreground">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 transition-colors cursor-pointer ${notification.is_read ? "bg-white opacity-60" : getNotificationColor(notification.type)
                                                }`}
                                            onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "font-medium"}`}>
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {new Date(notification.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                {!notification.is_read && (
                                                    <div className="flex-shrink-0">
                                                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
