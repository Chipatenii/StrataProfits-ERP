"use client"

import { useEffect, useState } from "react"
import { Bell, X, CheckCircle2, AlertTriangle, Clock, Calendar, Star, Upload, ClipboardCheck } from "lucide-react"
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
        loadNotifications()

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
            if (!response.ok) {
                setNotifications([])
                return
            }
            const data = await response.json()
            setNotifications(Array.isArray(data) ? data : [])
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
                return <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            case "time_exceeded":
                return <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            case "due_date_reminder":
                return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            case "pto_approved":
            case "pto_rejected":
                return <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            case "review_published":
                return <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            case "file_shared":
                return <Upload className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            case "onboarding_assigned":
                return <ClipboardCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            default:
                return <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        }
    }

    const unreadCount = notifications.filter((n) => !n.is_read).length

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                title="Notifications"
            >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    <div className="absolute right-0 mt-2 w-96 max-h-[32rem] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden shadow-lg">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
                                    <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto max-h-[28rem]">
                            {loading ? (
                                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 transition-colors cursor-pointer ${notification.is_read
                                                ? "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                                                : "bg-emerald-50/40 dark:bg-emerald-950/10 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/20"
                                                }`}
                                            onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                                                    {getNotificationIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm ${notification.is_read ? "text-slate-500 dark:text-slate-400" : "font-medium text-slate-900 dark:text-white"}`}>
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                                        {new Date(notification.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                {!notification.is_read && (
                                                    <div className="w-2 h-2 bg-emerald-700 rounded-full mt-2" />
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
