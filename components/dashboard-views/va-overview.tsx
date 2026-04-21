"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { AlertCircle, Clock } from "lucide-react"
import { Task, Invoice, Meeting, UserProfile } from "@/lib/types"
import { TaskDetailModal } from "@/components/modals/task-detail-modal"
import { getTimeBasedGreeting } from "@/lib/time-utils"

interface VAOverviewProps {
    userName: string
    userId: string
    onViewChange?: (view: string) => void
}

export function VAOverview({ userName, userId, onViewChange }: VAOverviewProps) {
    const [stats, setStats] = useState({ leads: 0, proposals: 0 })
    const [currentTime, setCurrentTime] = useState<Date | null>(null)
    const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    const fetcher = (url: string) => fetch(url).then(r => r.json())
    const { data: tasksRaw = [] } = useSWR<Task[]>(`/api/tasks?assignee_id=${userId}&status=pending`, fetcher)
    const tasks = Array.isArray(tasksRaw) ? tasksRaw.slice(0, 5) : []

    const { data: overdueInvoices = [] } = useSWR<Invoice[]>('/api/invoices?status=overdue', fetcher)
    const { data: dealsData = [] } = useSWR<any[]>('/api/admin/deals', fetcher)

    const todayStr = new Date().toISOString().split('T')[0]
    const { data: meetings = [] } = useSWR<Meeting[]>(`/api/meetings?date=${todayStr}`, fetcher)
    const { data: members = [] } = useSWR<UserProfile[]>('/api/admin/members', fetcher)

    const handleCardClick = (task: Task) => {
        setSelectedTaskDetail(task)
        setIsDetailModalOpen(true)
    }

    useEffect(() => {
        setCurrentTime(new Date())
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        if (Array.isArray(dealsData)) {
            const now = new Date()
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            const newLeads = dealsData.filter((d: { created_at: string, stage: string }) => new Date(d.created_at) > oneWeekAgo).length
            const proposals = dealsData.filter((d: { created_at: string, stage: string }) => d.stage === 'Proposal').length
            setStats({ leads: newLeads, proposals })
        }
    }, [dealsData])

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div>
                <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">
                    {currentTime ? getTimeBasedGreeting(userName) : `Hello, ${userName.split(' ')[0]}`}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {currentTime ? (
                        <>
                            {new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(currentTime)}
                            {' · '}
                            <span className="font-mono text-emerald-700 dark:text-emerald-400">
                                {new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(currentTime)}
                            </span>
                        </>
                    ) : null}
                </p>
            </div>

            {/* Alerts */}
            {(overdueInvoices.length > 0) && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 text-rose-800 dark:text-rose-300 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-semibold text-sm">Attention needed</h4>
                        <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                            {overdueInvoices.map(inv => (
                                <li key={inv.id}>
                                    Invoice {inv.invoice_number || 'Unknown'} for {inv.client?.name || 'Client'} is overdue.
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* KPI strip */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <StatCard label="New leads (week)" value={stats.leads} />
                <StatCard label="Proposals sent" value={stats.proposals} />
                <StatCard label="Pending tasks" value={tasks.length} />
                <StatCard label="Urgent invoices" value={overdueInvoices.length} accent={overdueInvoices.length > 0} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Today's priorities */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-semibold text-base text-slate-900 dark:text-white">Today&apos;s priorities</h3>
                        <button onClick={() => onViewChange?.('tasks')} className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium">View all</button>
                    </div>
                    <div className="p-3 space-y-2">
                        {tasks.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">No pending tasks for today.</p>
                        ) : (
                            tasks.map(task => (
                                <button
                                    key={task.id}
                                    onClick={() => handleCardClick(task)}
                                    className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${task.priority === 'high' ? 'bg-rose-500' : 'bg-emerald-600'}`} />
                                        <span className="font-medium text-sm text-slate-900 dark:text-white truncate">{task.title}</span>
                                    </div>
                                    {task.due_date && (
                                        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                                            <Clock className="w-3 h-3" />
                                            {new Date(task.due_date).toLocaleDateString()}
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Upcoming meetings */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-semibold text-base text-slate-900 dark:text-white">Upcoming meetings</h3>
                        <button onClick={() => onViewChange?.('meetings')} className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium">Full schedule</button>
                    </div>
                    <div className="p-3 space-y-2">
                        {meetings.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">No meetings scheduled today.</p>
                        ) : (
                            meetings.map(meeting => (
                                <div
                                    key={meeting.id}
                                    className="flex items-center justify-between p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/40"
                                >
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">{meeting.title}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">{meeting.mode} · {meeting.client?.name || 'In-house'}</span>
                                    </div>
                                    <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-1 rounded-md shrink-0">
                                        {new Date(meeting.date_time_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            <TaskDetailModal
                open={isDetailModalOpen}
                task={selectedTaskDetail}
                members={members}
                onOpenChange={setIsDetailModalOpen}
            />
        </div>
    )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${accent ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{value}</p>
        </div>
    )
}
