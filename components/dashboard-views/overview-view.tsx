"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { ClipboardList, Users, Folder, AlertCircle, DollarSign, Wallet, ArrowUpRight, Target, Trophy } from "lucide-react"
import type { Invoice, Deal, Project } from "@/lib/types"

interface OverviewStats {
    leaderboard?: { name: string; totalHours: number }[];
    bestPerformer?: { name: string; completedTasks: number; totalHours: number; totalEarnings: number } | null;
}

interface OverviewViewProps {
    stats: OverviewStats;
    taskStats: {
        total: number
        active: number
        completed: number
        pending: number
    }
    membersCount: number
    setActiveView: (view: string) => void
}

export function OverviewView({ stats, taskStats, membersCount, setActiveView }: OverviewViewProps) {
    const [overdueInvoices, setOverdueInvoices] = useState<Invoice[]>([])
    const [pipelineStats, setPipelineStats] = useState({ count: 0, value: 0 })
    const [financeStats, setFinanceStats] = useState({ revenueYTD: 0, outstanding: 0, outstandingCount: 0 })
    const [activeProjectsCount, setActiveProjectsCount] = useState(0)

    const fetcher = (url: string) => fetch(url).then(res => res.json())
    const { data: invoicesData } = useSWR<Invoice[]>('/api/invoices', fetcher)
    const { data: dealsData } = useSWR<Deal[]>('/api/admin/deals', fetcher)
    const { data: paymentsData } = useSWR<{ payment_date: string, amount: number }[]>('/api/payments', fetcher)
    const { data: projectsData } = useSWR<Project[]>('/api/admin/projects', fetcher)

    useEffect(() => {
        if (Array.isArray(invoicesData)) {
            const overdue = invoicesData.filter(inv => inv.status === 'overdue')
            const outstanding = invoicesData.filter(inv => inv.status === 'sent' || inv.status === 'overdue')
            const outstandingAmount = outstanding.reduce((acc, inv) => acc + (inv.amount || 0), 0)
            setOverdueInvoices(overdue)
            setFinanceStats(prev => ({
                ...prev,
                outstanding: outstandingAmount,
                outstandingCount: outstanding.length
            }))
        }
    }, [invoicesData])

    useEffect(() => {
        if (Array.isArray(dealsData)) {
            const activeDeals = dealsData.filter(d => d.stage !== 'Won' && d.stage !== 'Lost')
            const value = activeDeals.reduce((acc, d) => acc + (d.estimated_value || 0), 0)
            setPipelineStats({ count: activeDeals.length, value })
        }
    }, [dealsData])

    useEffect(() => {
        if (Array.isArray(paymentsData)) {
            const currentYear = new Date().getFullYear()
            const ytdPayments = paymentsData.filter(p => new Date(p.payment_date).getFullYear() === currentYear)
            const revenue = ytdPayments.reduce((acc, p) => acc + (p.amount || 0), 0)
            setFinanceStats(prev => ({ ...prev, revenueYTD: revenue }))
        }
    }, [paymentsData])

    useEffect(() => {
        if (Array.isArray(projectsData)) {
            const activeCount = projectsData.filter(p => p.status === 'active').length
            setActiveProjectsCount(activeCount)
        }
    }, [projectsData])

    const totalHoursLogged = stats?.leaderboard
        ? Math.round(stats.leaderboard.reduce((acc, curr) => acc + curr.totalHours, 0))
        : null

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page title (QuickBooks-style: simple, no gradients) */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Business performance, team productivity, and financial health at a glance.</p>
                </div>
            </div>

            {/* Headline KPI strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <KpiCard
                    label="Revenue YTD"
                    value={`ZMW ${(financeStats.revenueYTD / 1000).toFixed(0)}K`}
                    icon={<DollarSign className="w-4 h-4" />}
                    tone="emerald"
                />
                <KpiCard
                    label="Active deals"
                    value={pipelineStats.count.toString()}
                    icon={<Target className="w-4 h-4" />}
                    tone="slate"
                />
                <KpiCard
                    label="Active projects"
                    value={activeProjectsCount.toString()}
                    icon={<Folder className="w-4 h-4" />}
                    tone="slate"
                />
                <KpiCard
                    label="Team members"
                    value={membersCount.toString()}
                    icon={<Users className="w-4 h-4" />}
                    tone="slate"
                />
            </div>

            {/* Alerts */}
            {(overdueInvoices.length > 0 || taskStats.pending > 0) && (
                <div className="grid gap-4 md:grid-cols-2">
                    {overdueInvoices.length > 0 && (
                        <AlertRow
                            tone="red"
                            icon={<AlertCircle className="w-5 h-5" />}
                            title="Overdue invoices"
                            description={`${overdueInvoices.length} invoice${overdueInvoices.length !== 1 ? "s" : ""} require attention`}
                            cta="View invoices"
                            onClick={() => setActiveView("sales")}
                        />
                    )}
                    {taskStats.pending > 0 && (
                        <AlertRow
                            tone="amber"
                            icon={<ClipboardList className="w-5 h-5" />}
                            title="Pending reviews"
                            description={`${taskStats.pending} task${taskStats.pending !== 1 ? "s" : ""} awaiting approval`}
                            cta="Review now"
                            onClick={() => setActiveView("tasks")}
                        />
                    )}
                </div>
            )}

            {/* Detailed Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DetailCard
                    label="Revenue"
                    value={`ZMW ${financeStats.revenueYTD.toLocaleString()}`}
                    icon={<DollarSign className="w-5 h-5" />}
                    badge="YTD"
                    accent="emerald"
                />
                <DetailCard
                    label="Outstanding"
                    value={`ZMW ${financeStats.outstanding.toLocaleString()}`}
                    icon={<Wallet className="w-5 h-5" />}
                    badge={`${financeStats.outstandingCount} open`}
                    accent="orange"
                />
                <DetailCard
                    label="Pipeline deals"
                    value={pipelineStats.count.toString()}
                    icon={<Target className="w-5 h-5" />}
                    badge="Active"
                    accent="blue"
                    subtext={`Est. ZMW ${pipelineStats.value.toLocaleString()}`}
                />
                <DetailCard
                    label="Active projects"
                    value={activeProjectsCount.toString()}
                    icon={<Folder className="w-5 h-5" />}
                    badge="In progress"
                    accent="violet"
                />
            </div>

            {/* Team overview + Top Performer */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Team overview */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 mb-5">
                        <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/40 rounded-md">
                            <Users className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Team overview</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <TeamStat label="Active members" value={membersCount.toString()} />
                        <TeamStat label="Tasks in progress" value={taskStats.active.toString()} />
                        <TeamStat label="Completed" value={taskStats.completed.toString()} accent />
                        <TeamStat label="Hours logged" value={totalHoursLogged !== null ? `${totalHoursLogged}h` : "—"} />
                    </div>
                </div>

                {/* Top Performer */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 mb-5">
                        <div className="p-1.5 bg-amber-50 dark:bg-amber-900/40 rounded-md">
                            <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Top performer</h3>
                    </div>

                    {stats?.bestPerformer ? (
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-xl bg-emerald-700 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                                {stats.bestPerformer.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg font-semibold text-slate-900 dark:text-white truncate">{stats.bestPerformer.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{stats.bestPerformer.completedTasks} tasks completed</p>
                                <div className="flex items-center gap-2 mt-3">
                                    <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md px-2.5 py-1 text-xs font-medium">
                                        {stats.bestPerformer.totalHours}h logged
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-md px-2.5 py-1 text-xs font-medium">
                                        ZMW {stats.bestPerformer.totalEarnings.toFixed(0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            No performance data available yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ──────────────────────────── Subcomponents ──────────────────────────── */

function KpiCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "emerald" | "slate" }) {
    const iconClass =
        tone === "emerald"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${iconClass}`}>{icon}</div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
            </div>
            <p className="text-2xl md:text-[26px] font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
        </div>
    )
}

function AlertRow({
    tone,
    icon,
    title,
    description,
    cta,
    onClick,
}: {
    tone: "red" | "amber"
    icon: React.ReactNode
    title: string
    description: string
    cta: string
    onClick: () => void
}) {
    const map = {
        red: {
            bg: "bg-red-50 dark:bg-red-950/30",
            border: "border-red-200 dark:border-red-900/50",
            iconBg: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
            title: "text-red-900 dark:text-red-100",
            text: "text-red-700 dark:text-red-300",
            button: "bg-red-600 hover:bg-red-700",
        },
        amber: {
            bg: "bg-amber-50 dark:bg-amber-950/30",
            border: "border-amber-200 dark:border-amber-900/50",
            iconBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
            title: "text-amber-900 dark:text-amber-100",
            text: "text-amber-700 dark:text-amber-300",
            button: "bg-amber-600 hover:bg-amber-700",
        },
    }[tone]

    return (
        <div className={`${map.bg} ${map.border} border rounded-xl p-5`}>
            <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg ${map.iconBg} shrink-0`}>{icon}</div>
                <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-[15px] ${map.title}`}>{title}</h4>
                    <p className={`text-sm mt-0.5 ${map.text}`}>{description}</p>
                    <button
                        onClick={onClick}
                        className={`mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 ${map.button} text-white rounded-md font-medium text-sm transition-colors`}
                    >
                        {cta}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    )
}

function DetailCard({
    label,
    value,
    icon,
    badge,
    accent,
    subtext,
}: {
    label: string
    value: string
    icon: React.ReactNode
    badge: string
    accent: "emerald" | "orange" | "blue" | "violet"
    subtext?: string
}) {
    const map = {
        emerald: { iconBg: "bg-emerald-700 text-white", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
        orange: { iconBg: "bg-orange-500 text-white", badge: "bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
        blue: { iconBg: "bg-blue-600 text-white", badge: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
        violet: { iconBg: "bg-violet-600 text-white", badge: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
    }[accent]

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${map.iconBg}`}>{icon}</div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${map.badge}`}>{badge}</span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            {subtext && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtext}</p>}
        </div>
    )
}

function TeamStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className={`rounded-lg p-4 text-center border ${accent ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/50" : "bg-slate-50 border-slate-100 dark:bg-slate-800/40 dark:border-slate-800"}`}>
            <p className={`text-2xl font-bold ${accent ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-white"}`}>{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
        </div>
    )
}
