"use client"

import { useEffect, useState, useCallback, Fragment } from "react"
import useSWR from "swr"
import { Download, Loader2 } from "lucide-react"
import { PDFService } from "@/lib/pdf-service"
import { OrganizationSettings } from "@/lib/types"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { RecordPayrollModal } from "@/components/modals/record-payroll-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TeamMemberReport {
    user_id: string
    full_name: string
    email: string
    hourly_rate: number
    total_hours: number
    total_minutes: number
    days_worked: number
    average_hours_per_day: number
    estimated_payroll: number
    total_paid?: number
    remaining_balance?: number
    payments?: Array<{
        id: string
        payment_date: string
        amount: number
        payment_method: string
        reference: string
        notes?: string
    }>
    tasks: Array<{
        title: string
        hours: number
        estimated: number | null
        status: string
    }>
}

export function ReportsView({ hideHeader = false }: { hideHeader?: boolean }) {
    return (
        <div className="space-y-6 animate-fade-in">
            {!hideHeader && (
                <div>
                    <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Reports</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Business intelligence, payroll, and financial statements.</p>
                </div>
            )}

            <Tabs defaultValue="workforce" className="space-y-5">
                <TabsList className="bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 h-auto inline-flex">
                    <TabsTrigger
                        value="workforce"
                        className="px-4 py-1.5 rounded-md text-sm font-medium data-[state=active]:bg-emerald-700 data-[state=active]:text-white"
                    >
                        Workforce &amp; Payroll
                    </TabsTrigger>
                    <TabsTrigger
                        value="financial"
                        className="px-4 py-1.5 rounded-md text-sm font-medium data-[state=active]:bg-emerald-700 data-[state=active]:text-white"
                    >
                        Financial statements
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="workforce" className="space-y-5 mt-5">
                    <WorkforceReports />
                </TabsContent>
                <TabsContent value="financial" className="space-y-5 mt-5">
                    <FinancialReports />
                </TabsContent>
            </Tabs>
        </div>
    )
}

import { toast } from "sonner"
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Users as UsersIcon, PieChart } from "lucide-react"

function FinancialReports() {
    const [dateRange, setDateRange] = useState(() => {
        const now = new Date()
        return {
            start: `${now.getFullYear()}-01-01`,
            end: now.toISOString().split("T")[0],
        }
    })

    const fetcher = (url: string) => fetch(url).then(r => { if(!r.ok) throw new Error(); return r.json() })
    const params = new URLSearchParams({
        type: "all",
        start_date: dateRange.start,
        end_date: dateRange.end,
    })
    const { data, error, isLoading: loading } = useSWR(`/api/reports/financial?${params}`, fetcher)

    useEffect(() => {
        if (error) toast.error("Failed to load financial data")
    }, [error])

    if (loading) return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
    )

    if (!data) return <p className="text-center text-muted-foreground py-8">No financial data available.</p>

    const pnl = data.pnl || {}
    const receivables = data.receivables || {}
    const revenueByClient = data.revenueByClient || []
    const expenseBreakdown = data.expenseBreakdown || {}

    const CATEGORY_COLORS: Record<string, string> = {
        Transport: "bg-blue-500", Data: "bg-cyan-500", OfficeSpace: "bg-violet-500",
        Meal: "bg-amber-500", Other: "bg-slate-500",
    }

    return (
        <div className="space-y-6">
            {/* Date Range */}
            <div className="flex flex-wrap items-center gap-3">
                <input type="date" value={dateRange.start} onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-sm text-foreground" />
                <span className="text-muted-foreground text-sm">to</span>
                <input type="date" value={dateRange.end} onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-sm text-foreground" />
            </div>

            {/* P&L Summary */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-500" /><span className="text-xs font-semibold text-muted-foreground uppercase">Revenue</span></div>
                    <p className="text-2xl font-bold text-emerald-600">ZMW {(pnl.totalRevenue || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">{pnl.invoiceCount || 0} paid invoices</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-red-500" /><span className="text-xs font-semibold text-muted-foreground uppercase">Expenses</span></div>
                    <p className="text-2xl font-bold text-red-600">ZMW {(pnl.totalExpenses || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">{pnl.expenseCount || 0} approved expenses</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-indigo-500" /><span className="text-xs font-semibold text-muted-foreground uppercase">Net Profit</span></div>
                    <p className={`text-2xl font-bold ${(pnl.netProfit || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>ZMW {(pnl.netProfit || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(pnl.profitMargin || 0).toFixed(1)}% margin</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-amber-500" /><span className="text-xs font-semibold text-muted-foreground uppercase">Pending</span></div>
                    <p className="text-2xl font-bold text-amber-600">ZMW {(pnl.pendingRevenue || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">Unpaid invoices</p>
                </div>
            </div>

            {/* Aged Receivables & Revenue by Client side by side */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Aged Receivables */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-foreground mb-1">Aged Receivables</h3>
                    <p className="text-sm text-muted-foreground mb-4">ZMW {(receivables.totalOutstanding || 0).toLocaleString()} outstanding across {receivables.totalInvoices || 0} invoices</p>
                    <div className="space-y-3">
                        {[
                            { label: "Current", key: "current", color: "bg-emerald-500" },
                            { label: "1–30 days", key: "days30", color: "bg-amber-500" },
                            { label: "31–60 days", key: "days60", color: "bg-orange-500" },
                            { label: "61–90 days", key: "days90", color: "bg-red-500" },
                            { label: "90+ days", key: "over90", color: "bg-red-700" },
                        ].map(bucket => {
                            const amount = receivables.buckets?.[bucket.key] || 0
                            const pct = (receivables.totalOutstanding || 0) > 0 ? (amount / receivables.totalOutstanding * 100) : 0
                            return (
                                <div key={bucket.key}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-muted-foreground">{bucket.label}</span>
                                        <span className="font-semibold text-foreground">ZMW {amount.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${bucket.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Revenue by Client */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-foreground mb-1">Revenue by Client</h3>
                    <p className="text-sm text-muted-foreground mb-4">Top clients by paid revenue</p>
                    {revenueByClient.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No client revenue data yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {revenueByClient.slice(0, 8).map((client: { name: string, total: number, count: number }, idx: number) => {
                                const maxRevenue = revenueByClient[0]?.total || 1
                                return (
                                    <div key={idx}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-foreground font-medium truncate mr-2">{client.name}</span>
                                            <span className="font-semibold text-foreground shrink-0">ZMW {client.total.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${(client.total / maxRevenue) * 100}%` }} />
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">{client.count} invoice{client.count !== 1 ? "s" : ""}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Expense Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-foreground mb-1">Expense Breakdown</h3>
                <p className="text-sm text-muted-foreground mb-4">ZMW {(expenseBreakdown.total || 0).toLocaleString()} total across {(expenseBreakdown.categories || []).length} categories</p>
                {(expenseBreakdown.categories || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No expense data yet.</p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {(expenseBreakdown.categories || []).map((cat: { name: string, amount: number, percentage: number }) => (
                            <div key={cat.name} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <div className={`w-3 h-3 rounded-full shrink-0 ${CATEGORY_COLORS[cat.name] || "bg-slate-400"}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                                    <p className="text-xs text-muted-foreground">ZMW {cat.amount.toLocaleString()} ({cat.percentage.toFixed(1)}%)</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function WorkforceReports() {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
    const [orgSettings, setOrgSettings] = useState<Partial<OrganizationSettings>>({})

    // Payroll Modal State
    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false)
    const [memberToPay, setMemberToPay] = useState<{ id: string, name: string, estimatedPayroll: number } | null>(null)

    const fetcherPost = ([url, body]: [string, any]) => fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }).then(r => r.json())
    const orgFetcher = (url: string) => fetch(url).then((r: Response) => r.ok ? r.json() : {})

    const { data: orgSettingsData = {} } = useSWR<Partial<OrganizationSettings>>("/api/organization", orgFetcher)

    const [year, month] = selectedMonth.split("-")
    const startDate = `${year}-${month}-01`
    const endDate = new Date(Number.parseInt(year), Number.parseInt(month), 0).toISOString().split("T")[0]

    const { data: reportData, isLoading: loading, mutate: loadReports } = useSWR(
        ["/api/admin/reports", { startDate, endDate }],
        fetcherPost
    )

    const reports = reportData?.reports || []
    const totalCompanyHours = reportData?.totalCompanyHours || 0
    const totalEstimatedPayroll = reportData?.totalEstimatedPayroll || 0

    const [topPerformer, setTopPerformer] = useState<TeamMemberReport | null>(null)
    const [leastProductive, setLeastProductive] = useState<TeamMemberReport | null>(null)
    const [expandedUser, setExpandedUser] = useState<string | null>(null)

    useEffect(() => {
        if (reports && reports.length > 0) {
            const top = reports.reduce((prev: TeamMemberReport, current: TeamMemberReport) =>
                (current.total_hours > prev.total_hours) ? current : prev
            )
            setTopPerformer(top)

            const least = reports.reduce((prev: TeamMemberReport, current: TeamMemberReport) =>
                (current.total_hours < prev.total_hours && current.total_hours > 0) ? current : prev
            )
            setLeastProductive(least)
        } else {
            setTopPerformer(null)
            setLeastProductive(null)
        }
    }, [reports])

    useEffect(() => {
        setOrgSettings(orgSettingsData)
    }, [orgSettingsData])

    // Real-time subscriptions
    useRealtimeSubscription("tasks", loadReports)
    useRealtimeSubscription("time_logs", loadReports)

    const handleExportPDF = () => {
        PDFService.generateWorkforceReportPDF({
            month: selectedMonth,
            totalHours: totalCompanyHours,
            teamCount: reports.filter((r: any) => r.days_worked > 0).length,
            reports: reports
        }, orgSettings)
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        )
    }

    return (
        <Fragment>
            <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">Monthly Workforce Report</h2>
                    <p className="text-sm text-muted-foreground">Track team hours, payroll, and productivity.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full sm:w-auto px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    />
                    <button onClick={handleExportPDF} className="w-full sm:w-auto flex items-center justify-center gap-2 btn-secondary text-sm px-4 py-2">
                        <Download className="w-4 h-4" />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Summary Card */}
            <div className="glass-card rounded-xl p-4 md:p-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Summary</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-background/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                        <p className="text-2xl font-bold text-accent">{totalCompanyHours.toFixed(1)}</p>
                    </div>
                    <div className="p-4 bg-background/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Team Count</p>
                        <p className="text-2xl font-bold text-primary">{reports.filter((r: any) => r.days_worked > 0).length}</p>
                    </div>
                    <div className="p-4 bg-background/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Avg Hours/Person</p>
                        <p className="text-2xl font-bold text-primary">
                            {reports.length > 0
                                ? (Math.round((reports.reduce((acc: number, r: any) => acc + r.total_hours, 0) / reports.length) * 100) / 100).toFixed(1)
                                : "0"}
                        </p>
                    </div>
                    <div className="p-4 bg-background/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Est. Payroll</p>
                        <p className="text-2xl font-bold text-green-600 truncate">ZMW {totalEstimatedPayroll.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Productivity Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {topPerformer ? (
                    <div className="glass-card rounded-xl p-6 bg-green-50/50 border-green-100 flex items-center justify-between">
                        <div>
                            <p className="flex items-center gap-2 text-sm font-semibold text-green-800 mb-1">
                                Top Performer 🏆
                            </p>
                            <p className="font-bold text-lg">{topPerformer.full_name}</p>
                            <p className="text-xs text-green-700">{topPerformer.email}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-green-700">{topPerformer.total_hours.toFixed(1)}h</p>
                        </div>
                    </div>
                ) : null}

                {leastProductive ? (
                    <div className="glass-card rounded-xl p-6 bg-orange-50/50 border-orange-100 flex items-center justify-between">
                        <div>
                            <p className="flex items-center gap-2 text-sm font-semibold text-orange-800 mb-1">
                                Needs Support 💪
                            </p>
                            <p className="font-bold text-lg">{leastProductive.full_name}</p>
                            <p className="text-xs text-orange-700">{leastProductive.email}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-orange-700">{leastProductive.total_hours.toFixed(1)}h</p>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Detail List / Table */}
            <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border/50">
                    <h3 className="font-semibold text-foreground">Team Details</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/30">
                            <tr className="border-b border-border/50">
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total Hours</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Days</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Daily Avg</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Est. Payroll</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Balance</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {reports.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        No data available for this month
                                    </td>
                                </tr>
                            ) : (
                                reports.map((report: any) => (
                                    <Fragment key={report.user_id}>
                                        <tr
                                            className="hover:bg-muted/20 transition-colors cursor-pointer"
                                            onClick={() => setExpandedUser(expandedUser === report.user_id ? null : report.user_id)}
                                        >
                                            <td className="px-4 py-4">
                                                <div className="font-medium">{report.full_name}</div>
                                                <div className="text-xs text-muted-foreground sm:hidden">{report.email}</div>
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-accent">{report.total_hours.toFixed(1)}</td>
                                            <td className="px-4 py-4 hidden sm:table-cell">{report.days_worked}</td>
                                            <td className="px-4 py-4 hidden sm:table-cell">{report.average_hours_per_day.toFixed(1)}</td>
                                            <td className="px-4 py-4 font-medium text-muted-foreground">ZMW {report.estimated_payroll.toFixed(0)}</td>
                                            <td className="px-4 py-4 font-bold text-accent">ZMW {(report.remaining_balance || 0).toFixed(0)}</td>
                                            <td className="px-4 py-4 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setMemberToPay({
                                                            id: report.user_id,
                                                            name: report.full_name,
                                                            estimatedPayroll: report.remaining_balance || report.estimated_payroll
                                                        })
                                                        setIsPayrollModalOpen(true)
                                                    }}
                                                    className="text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-xs md:text-sm transition-colors whitespace-nowrap"
                                                >
                                                    Pay
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedUser === report.user_id && (
                                            <tr className="bg-muted/20 shadow-inner">
                                                <td colSpan={7} className="px-4 py-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-2 sm:pl-4 border-l-2 border-accent/30">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Payment History</h4>
                                                                <span className="text-xs text-muted-foreground">Total: ZMW {(report.total_paid || 0).toFixed(0)}</span>
                                                            </div>
                                                            {report.payments && report.payments.length > 0 ? (
                                                                <div className="grid gap-2">
                                                                    {report.payments.map((payment: any) => (
                                                                        <div key={payment.id} className="flex items-center justify-between text-xs sm:text-sm bg-background p-2 rounded border border-border/50">
                                                                            <div>
                                                                                <span className="font-semibold text-green-600">ZMW {payment.amount.toFixed(0)}</span>
                                                                                <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(payment.payment_date).toLocaleDateString()}</p>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <span className="capitalize text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{payment.payment_method.replace('_', ' ')}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-muted-foreground italic bg-background p-3 rounded border border-dashed border-border/50 text-center">No past payments recorded.</p>
                                                            )}
                                                        </div>
                                                        <div className="space-y-3">
                                                            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Top Tasks</h4>
                                                            {report.tasks && report.tasks.length > 0 ? (
                                                            <div className="grid gap-2">
                                                                {report.tasks.slice(0, 5).map((task: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center justify-between text-xs sm:text-sm bg-background p-2 rounded border border-border/50">
                                                                        <span className="font-medium truncate mr-2">{task.title}</span>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <span className="font-mono">{task.hours.toFixed(1)}h</span>
                                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                                task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                                                }`}>
                                                                                {task.status.replace('_', ' ')}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {report.tasks.length > 5 && (
                                                                    <p className="text-xs text-muted-foreground italic text-center">+ {report.tasks.length - 5} more tasks</p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground">No specific task data available.</p>
                                                        )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Record Payroll Modal */}
            <RecordPayrollModal
                open={isPayrollModalOpen}
                onOpenChange={setIsPayrollModalOpen}
                onSuccess={loadReports}
                member={memberToPay}
                periodStart={`${selectedMonth}-01`}
                periodEnd={`${selectedMonth}-${new Date(Number.parseInt(selectedMonth.split("-")[0]), Number.parseInt(selectedMonth.split("-")[1]), 0).getDate()}`}
            />
        </div>
        </Fragment>
    )
}
