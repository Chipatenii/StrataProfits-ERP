"use client"

import { useState } from "react"
import useSWR from "swr"
import {
    Activity, Upload, Calendar, Star, ClipboardCheck,
    DollarSign, Users, FolderKanban
} from "lucide-react"

interface ActivityItem {
    id: string
    user_id: string
    action: string
    entity_type: string
    entity_id: string | null
    metadata: Record<string, any>
    created_at: string
    user?: { id: string; full_name: string; avatar_url: string | null; role: string }
}

const ENTITY_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
    task: { icon: ClipboardCheck, color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
    invoice: { icon: DollarSign, color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
    file: { icon: Upload, color: "text-slate-600 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300" },
    time_off: { icon: Calendar, color: "text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
    review: { icon: Star, color: "text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
    project: { icon: FolderKanban, color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
    client: { icon: Users, color: "text-slate-600 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300" },
    onboarding: { icon: ClipboardCheck, color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
    default: { icon: Activity, color: "text-slate-600 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300" },
}

const FILTERS = ["all", "task", "invoice", "file", "time_off", "review", "project"]

export function ActivityFeed({ limit = 25 }: { limit?: number }) {
    const [filter, setFilter] = useState("all")

    const params = new URLSearchParams({ limit: String(limit) })
    if (filter !== "all") params.set("entity_type", filter)

    const fetcher = (url: string) => fetch(url).then(res => res.json())
    const { data: activities = [], isLoading: loading } = useSWR<ActivityItem[]>(`/api/activity?${params}`, fetcher)

    const formatRelativeTime = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return "Just now"
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        const days = Math.floor(hrs / 24)
        if (days < 7) return `${days}d ago`
        return new Date(dateStr).toLocaleDateString()
    }

    const formatAction = (item: ActivityItem) => {
        const title = item.metadata?.title || item.metadata?.name || ""
        return (
            <span>
                <span className="font-semibold text-slate-900 dark:text-white">{item.user?.full_name || "Someone"}</span>
                {" "}
                <span className="text-slate-500 dark:text-slate-400">{item.action.replace(/_/g, " ")}</span>
                {title && <span className="text-slate-900 dark:text-white font-medium"> &ldquo;{title}&rdquo;</span>}
            </span>
        )
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> Activity Feed
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Recent actions across the platform</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-colors ${filter === f
                                ? "bg-emerald-700 text-white"
                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                        >
                            {f === "all" ? "All" : f.replace(/_/g, " ")}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent"></div>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="text-center py-12">
                        <Activity className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">No activity recorded yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activities.map(item => {
                            const config = ENTITY_CONFIG[item.entity_type] || ENTITY_CONFIG.default
                            const Icon = config.icon
                            return (
                                <div key={item.id} className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${config.color}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm leading-relaxed">{formatAction(item)}</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{formatRelativeTime(item.created_at)}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
