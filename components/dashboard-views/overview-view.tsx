"use client"

import { useMemo } from "react"
import useSWR from "swr"
import {
    ClipboardList,
    Users,
    Folder,
    AlertCircle,
    DollarSign,
    Wallet,
    ArrowUpRight,
    Target,
    Trophy,
    Receipt,
    TrendingUp,
} from "lucide-react"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts"
import type { Invoice, Deal, Project, Payment } from "@/lib/types"
import {
    KpiCard,
    MoneyBar,
    DashboardPanel,
    DashboardSkeleton,
    EmptyState,
} from "./dashboard-primitives"

interface OverviewStats {
    leaderboard?: { name: string; totalHours: number }[]
    bestPerformer?: { name: string; completedTasks: number; totalHours: number; totalEarnings: number } | null
}

interface OverviewViewProps {
    stats: OverviewStats
    taskStats: { total: number; active: number; completed: number; pending: number }
    membersCount: number
    setActiveView: (view: string) => void
}

const fetcher = (url: string) => fetch(url).then(res => res.json())
const swrOpts = { refreshInterval: 60_000, revalidateOnFocus: true }

export function OverviewView({ stats, taskStats, membersCount, setActiveView }: OverviewViewProps) {
    const { data: invoicesData, isLoading: invoicesLoading } = useSWR<Invoice[]>("/api/invoices", fetcher, swrOpts)
    const { data: dealsData } = useSWR<Deal[]>("/api/admin/deals", fetcher, swrOpts)
    const { data: paymentsData } = useSWR<Payment[]>("/api/payments", fetcher, swrOpts)
    const { data: projectsData } = useSWR<Project[]>("/api/admin/projects", fetcher, swrOpts)

    /* ────────────────── Derived metrics ────────────────── */

    const {
        overdueInvoices,
        overdueAmount,
        paidAmount,
        notDueAmount,
    } = useMemo(() => {
        if (!Array.isArray(invoicesData)) {
            return { overdueInvoices: [], overdueAmount: 0, paidAmount: 0, notDueAmount: 0 }
        }
        const now = new Date()
        now.setHours(0, 0, 0, 0)

        const isOverdue = (inv: Invoice) =>
            inv.status === "overdue" ||
            (inv.status === "sent" && inv.due_date != null && new Date(inv.due_date) < now)

        const overdue = invoicesData.filter(isOverdue)
        const paid = invoicesData.filter(i => i.status === "paid")
        const notDue = invoicesData.filter(i => i.status === "sent" && !isOverdue(i))

        const sum = (list: Invoice[]) => list.reduce((a, i) => a + (i.amount || 0), 0)

        return {
            overdueInvoices: overdue,
            overdueAmount: sum(overdue),
            paidAmount: sum(paid),
            notDueAmount: sum(notDue),
        }
    }, [invoicesData])

    const outstandingAmount = overdueAmount + notDueAmount
    const outstandingCount = Array.isArray(invoicesData)
        ? invoicesData.filter(i => i.status === "sent" || i.status === "overdue").length
        : 0

    const { pipelineCount, pipelineValue } = useMemo(() => {
        if (!Array.isArray(dealsData)) return { pipelineCount: 0, pipelineValue: 0 }
        const active = dealsData.filter(d => d.stage !== "Won" && d.stage !== "Lost")
        return {
            pipelineCount: active.length,
            pipelineValue: active.reduce((acc, d) => acc + (d.estimated_value || 0), 0),
        }
    }, [dealsData])

    const { revenueYTD, revenueTrend } = useMemo(() => {
        if (!Array.isArray(paymentsData)) return { revenueYTD: 0, revenueTrend: [] }
        const currentYear = new Date().getFullYear()

        // YTD total
        const ytd = paymentsData
            .filter(p => new Date(p.paid_at).getFullYear() === currentYear)
            .reduce((acc, p) => acc + (p.amount || 0), 0)

        // Last 6 months trend (inclusive of current)
        const now = new Date()
        const months: { key: string; label: string; total: number }[] = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            months.push({
                key: `${d.getFullYear()}-${d.getMonth()}`,
                label: d.toLocaleDateString(undefined, { month: "short" }),
                total: 0,
            })
        }
        const idx = new Map(months.map((m, i) => [m.key, i]))
        paymentsData.forEach(p => {
            const d = new Date(p.paid_at)
            const k = `${d.getFullYear()}-${d.getMonth()}`
            const i = idx.get(k)
            if (i !== undefined) months[i].total += p.amount || 0
        })

        return { revenueYTD: ytd, revenueTrend: months }
    }, [paymentsData])

    const activeProjectsCount = useMemo(() => {
        if (!Array.isArray(projectsData)) return 0
        return projectsData.filter(p => p.status === "active").length
    }, [projectsData])

    const recentPayments = useMemo(() => {
        if (!Array.isArray(paymentsData)) return []
        return [...paymentsData]
            .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
            .slice(0, 5)
    }, [paymentsData])

    const totalHoursLogged = stats?.leaderboard
        ? Math.round(stats.leaderboard.reduce((a, c) => a + c.totalHours, 0))
        : null

    const fmt = (n: number) => `ZMW ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    const fmtCompact = (n: number) => {
        if (n >= 1_000_000) return `ZMW ${(n / 1_000_000).toFixed(1)}M`
        if (n >= 1_000) return `ZMW ${(n / 1_000).toFixed(0)}K`
        return `ZMW ${n.toFixed(0)}`
    }

    /* ────────────────── Render ────────────────── */

    // Show skeleton on first load of the most important data source
    if (invoicesLoading && !invoicesData) {
        return <DashboardSkeleton />
    }

    return (
        <div className="space-y-5 md:space-y-6 animate-fade-in">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Business performance, receivables, and team productivity at a glance.
                    </p>
                </div>
            </div>

            {/* ═══ KPI strip — hero metrics ═══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <KpiCard
                    label="Revenue YTD"
                    value={fmtCompact(revenueYTD)}
                    icon={<DollarSign className="w-4 h-4" />}
                    tone="emerald"
                    subtext={fmt(revenueYTD)}
                />
                <KpiCard
                    label="Outstanding"
                    value={fmtCompact(outstandingAmount)}
                    icon={<Wallet className="w-4 h-4" />}
                    tone="amber"
                    subtext={`${outstandingCount} open invoice${outstandingCount !== 1 ? "s" : ""}`}
                />
                <KpiCard
                    label="Pipeline"
                    value={pipelineCount.toString()}
                    icon={<Target className="w-4 h-4" />}
                    tone="blue"
                    subtext={`Est. ${fmtCompact(pipelineValue)}`}
                    onClick={() => setActiveView("pipeline")}
                />
                <KpiCard
                    label="Active projects"
                    value={activeProjectsCount.toString()}
                    icon={<Folder className="w-4 h-4" />}
                    tone="violet"
                    subtext={`${membersCount} team member${membersCount !== 1 ? "s" : ""}`}
                    onClick={() => setActiveView("projects")}
                />
            </div>

            {/* ═══ Alerts ═══ */}
            {(overdueInvoices.length > 0 || taskStats.pending > 0) && (
                <div className="grid gap-3 md:grid-cols-2">
                    {overdueInvoices.length > 0 && (
                        <AlertRow
                            tone="rose"
                            icon={<AlertCircle className="w-4 h-4" />}
                            title={`${overdueInvoices.length} overdue invoice${overdueInvoices.length !== 1 ? "s" : ""}`}
                            description={`${fmt(overdueAmount)} past due`}
                            cta="Review"
                            onClick={() => setActiveView("sales")}
                        />
                    )}
                    {taskStats.pending > 0 && (
                        <AlertRow
                            tone="amber"
                            icon={<ClipboardList className="w-4 h-4" />}
                            title={`${taskStats.pending} task${taskStats.pending !== 1 ? "s" : ""} awaiting approval`}
                            description="Review and sign off completed work"
                            cta="Review"
                            onClick={() => setActiveView("tasks")}
                        />
                    )}
                </div>
            )}

            {/* ═══ Revenue trend + AR snapshot ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                    <DashboardPanel
                        title="Revenue trend — last 6 months"
                        icon={<TrendingUp className="w-4 h-4" />}
                        iconTone="emerald"
                        action={
                            <button
                                onClick={() => setActiveView("finance")}
                                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                                Finance details
                            </button>
                        }
                    >
                        {revenueTrend.length === 0 || revenueTrend.every(m => m.total === 0) ? (
                            <EmptyState
                                icon={<TrendingUp className="w-5 h-5" />}
                                title="No payments recorded yet"
                                description="Record a payment against an invoice to start tracking monthly revenue here."
                            />
                        ) : (
                            <div className="h-56 -mx-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={revenueTrend}
                                        margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                                                <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                            stroke="currentColor"
                                            className="text-slate-200 dark:text-slate-800"
                                        />
                                        <XAxis
                                            dataKey="label"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 11, fill: "currentColor" }}
                                            className="text-slate-500 dark:text-slate-400"
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 11, fill: "currentColor" }}
                                            className="text-slate-500 dark:text-slate-400"
                                            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`)}
                                            width={46}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: "var(--popover, white)",
                                                border: "1px solid rgb(226 232 240)",
                                                borderRadius: 8,
                                                fontSize: 12,
                                            }}
                                            formatter={(v: number) => [fmt(v), "Revenue"]}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#059669"
                                            strokeWidth={2}
                                            fill="url(#revFill)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </DashboardPanel>
                </div>

                {/* AR snapshot (QuickBooks-style money bar) */}
                <div>
                    <MoneyBar paid={paidAmount} overdue={overdueAmount} notDue={notDueAmount} />
                </div>
            </div>

            {/* ═══ Team overview + Top Performer ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <DashboardPanel
                    title="Team overview"
                    icon={<Users className="w-4 h-4" />}
                    iconTone="emerald"
                    className="lg:col-span-2"
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MiniStat label="Members" value={membersCount.toString()} />
                        <MiniStat label="In progress" value={taskStats.active.toString()} />
                        <MiniStat label="Completed" value={taskStats.completed.toString()} accent />
                        <MiniStat label="Hours logged" value={totalHoursLogged !== null ? `${totalHoursLogged}h` : "—"} />
                    </div>
                </DashboardPanel>

                <DashboardPanel
                    title="Top performer"
                    icon={<Trophy className="w-4 h-4" />}
                    iconTone="amber"
                >
                    {stats?.bestPerformer ? (
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-700 flex items-center justify-center text-xl font-bold text-white shrink-0">
                                {stats.bestPerformer.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                    {stats.bestPerformer.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {stats.bestPerformer.completedTasks} task
                                    {stats.bestPerformer.completedTasks !== 1 ? "s" : ""} · {stats.bestPerformer.totalHours}h
                                </p>
                                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                                    {fmt(stats.bestPerformer.totalEarnings)}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <EmptyState
                            icon={<Trophy className="w-5 h-5" />}
                            title="No performance data"
                            description="Log time against completed tasks to surface top performers."
                        />
                    )}
                </DashboardPanel>
            </div>

            {/* ═══ Recent payments ═══ */}
            <DashboardPanel
                title="Recent payments"
                icon={<Receipt className="w-4 h-4" />}
                iconTone="emerald"
                action={
                    <button
                        onClick={() => setActiveView("sales")}
                        className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                        View all
                    </button>
                }
            >
                {recentPayments.length === 0 ? (
                    <EmptyState
                        icon={<Receipt className="w-5 h-5" />}
                        title="No payments yet"
                        description="Record a payment against an invoice to see it here."
                    />
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800 -mx-2">
                        {recentPayments.map(p => (
                            <li
                                key={p.id}
                                className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                            >
                                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <Receipt className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {p.invoice?.client?.name || "Payment"}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        {p.invoice?.invoice_number || "—"} ·{" "}
                                        {new Date(p.paid_at).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </p>
                                </div>
                                <p className="font-semibold text-sm text-slate-900 dark:text-white tabular-nums">
                                    {fmt(p.amount)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </DashboardPanel>
        </div>
    )
}

/* ─────────────────────────── Subcomponents ─────────────────────────── */

function AlertRow({
    tone,
    icon,
    title,
    description,
    cta,
    onClick,
}: {
    tone: "rose" | "amber"
    icon: React.ReactNode
    title: string
    description: string
    cta: string
    onClick: () => void
}) {
    const map = {
        rose: {
            bg: "bg-rose-50 dark:bg-rose-950/30",
            border: "border-rose-200 dark:border-rose-900/50",
            iconBg: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
            title: "text-rose-900 dark:text-rose-100",
            text: "text-rose-700 dark:text-rose-300",
            button: "bg-rose-600 hover:bg-rose-700",
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
        <div className={`${map.bg} ${map.border} border rounded-xl p-4`}>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-md ${map.iconBg} shrink-0`}>{icon}</div>
                <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm ${map.title}`}>{title}</h4>
                    <p className={`text-xs mt-0.5 ${map.text}`}>{description}</p>
                    <button
                        onClick={onClick}
                        className={`mt-2.5 inline-flex items-center gap-1 px-3 py-1.5 ${map.button} text-white rounded-md font-semibold text-xs transition-colors`}
                    >
                        {cta}
                        <ArrowUpRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    )
}

function MiniStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
    return (
        <div
            className={`rounded-lg p-3 text-center border ${
                accent
                    ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/50"
                    : "bg-slate-50 border-slate-100 dark:bg-slate-800/40 dark:border-slate-800"
            }`}
        >
            <p
                className={`text-xl md:text-2xl font-bold ${
                    accent ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-white"
                }`}
            >
                {value}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wide">{label}</p>
        </div>
    )
}
