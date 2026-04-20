"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface AvailabilityIndicatorProps {
    userId: string
    className?: string
    showText?: boolean
}

export function AvailabilityIndicator({ userId, className = "", showText = false }: AvailabilityIndicatorProps) {
    const supabase = createClient()
    const [status, setStatus] = useState<"online" | "away" | "offline">("offline")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        const checkStatus = async () => {
            try {
                // Check if user has an active time log (clocked in)
                const { data: activeLog } = await supabase
                    .from("time_logs")
                    .select("id")
                    .eq("user_id", userId)
                    .is("clock_out", null)
                    .maybeSingle()

                if (!isMounted) return

                if (activeLog) {
                    setStatus("online")
                } else {
                    // Check last activity from profiles or session if available
                    // For now, if not clocked in, we check if they checked in today
                    const today = new Date().toISOString().split("T")[0]
                    const { data: checkIn } = await supabase
                        .from("daily_checkins")
                        .select("id")
                        .eq("user_id", userId)
                        .eq("date", today)
                        .maybeSingle()
                    
                    if (checkIn) setStatus("away") // Checked in but not actively working
                    else setStatus("offline")
                }
            } catch (error) {
                // Fail silently for status
                if (isMounted) setStatus("offline")
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        checkStatus()

        // Realtime subscription to time_logs changes for this user
        const channel = supabase.channel(`public:time_logs:user=${userId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'time_logs', filter: `user_id=eq.${userId}` },
                () => {
                    checkStatus()
                }
            )
            .subscribe()

        return () => {
            isMounted = false
            supabase.removeChannel(channel)
        }
    }, [userId, supabase])

    if (loading) {
        return <div className={`w-3 h-3 rounded-full bg-muted animate-pulse ${className}`} title="Loading status..." />
    }

    const config = {
        online: { color: "bg-emerald-500", ping: "bg-emerald-400", label: "Working" },
        away: { color: "bg-amber-500", ping: "bg-amber-400", label: "Signed In" },
        offline: { color: "bg-slate-300 dark:bg-slate-600", ping: "transparent", label: "Offline" },
    }[status]

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative flex h-3 w-3" title={config.label}>
                {status !== "offline" && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.ping}`} />
                )}
                <span className={`relative inline-flex rounded-full h-3 w-3 border-2 border-background ${config.color}`} />
            </div>
            {showText && <span className="text-xs text-muted-foreground font-medium">{config.label}</span>}
        </div>
    )
}
