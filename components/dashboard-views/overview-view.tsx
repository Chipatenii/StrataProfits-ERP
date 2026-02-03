"use client"

import { useEffect, useState } from "react"
import { ClipboardList, CheckCircle, Users, BarChart3, FileText, Folder, AlertCircle, TrendingUp, DollarSign, Wallet, ArrowUpRight, Sparkles, Target, Zap } from "lucide-react"
import type { Invoice, Deal, Project } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

interface OverviewViewProps {
    stats: any
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
    const supabase = createClient()

    useEffect(() => {
        fetch('/api/invoices')
            .then(res => res.json())
            .then((data: Invoice[]) => {
                if (Array.isArray(data)) {
                    const overdue = data.filter(inv => inv.status === 'overdue')
                    const outstanding = data.filter(inv => inv.status === 'sent' || inv.status === 'overdue')
                    const outstandingAmount = outstanding.reduce((acc, inv) => acc + (inv.amount || 0), 0)
                    setOverdueInvoices(overdue)
                    setFinanceStats(prev => ({
                        ...prev,
                        outstanding: outstandingAmount,
                        outstandingCount: outstanding.length
                    }))
                }
            })
            .catch(console.error)

        fetch('/api/admin/deals')
            .then(res => res.json())
            .then((data: Deal[]) => {
                if (Array.isArray(data)) {
                    const activeDeals = data.filter(d => d.stage !== 'Won' && d.stage !== 'Lost')
                    const value = activeDeals.reduce((acc, d) => acc + (d.estimated_value || 0), 0)
                    setPipelineStats({ count: activeDeals.length, value })
                }
            })
            .catch(console.error)

        fetch('/api/payments')
            .then(res => res.json())
            .then((data: any[]) => {
                if (Array.isArray(data)) {
                    const currentYear = new Date().getFullYear()
                    const ytdPayments = data.filter(p => new Date(p.payment_date).getFullYear() === currentYear)
                    const revenue = ytdPayments.reduce((acc, p) => acc + (p.amount || 0), 0)
                    setFinanceStats(prev => ({ ...prev, revenueYTD: revenue }))
                }
            })
            .catch(console.error)

        fetch('/api/admin/projects')
            .then(res => res.json())
            .then((data: Project[]) => {
                if (Array.isArray(data)) {
                    const activeCount = data.filter(p => p.status === 'active').length
                    setActiveProjectsCount(activeCount)
                }
            })
            .catch(console.error)

    }, [])

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-8 md:p-10 text-white shadow-2xl shadow-emerald-500/30">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-teal-300/10 rounded-full blur-xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-emerald-200" />
                        <span className="text-sm font-medium text-emerald-100 uppercase tracking-wider">Dashboard</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Executive Summary</h1>
                    <p className="text-emerald-100/80 text-lg max-w-xl">Track your business performance, team productivity, and financial health at a glance.</p>
                </div>

                {/* Quick Stats in Hero */}
                <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                        <p className="text-3xl font-bold">ZMW {(financeStats.revenueYTD / 1000).toFixed(0)}K</p>
                        <p className="text-sm text-emerald-100/80">Revenue YTD</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                        <p className="text-3xl font-bold">{pipelineStats.count}</p>
                        <p className="text-sm text-emerald-100/80">Active Deals</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                        <p className="text-3xl font-bold">{activeProjectsCount}</p>
                        <p className="text-sm text-emerald-100/80">Active Projects</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                        <p className="text-3xl font-bold">{membersCount}</p>
                        <p className="text-sm text-emerald-100/80">Team Members</p>
                    </div>
                </div>
            </div>

            {/* Alerts Section - Premium Style */}
            {(overdueInvoices.length > 0 || taskStats.pending > 0) && (
                <div className="grid gap-4 md:grid-cols-2">
                    {overdueInvoices.length > 0 && (
                        <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl p-6 shadow-lg shadow-red-500/10">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
                            <div className="relative flex items-start gap-4">
                                <div className="p-3 bg-red-500 rounded-xl text-white shadow-lg shadow-red-500/30">
                                    <AlertCircle className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-lg text-red-900 dark:text-red-100">Overdue Invoices</h4>
                                    <p className="text-red-700 dark:text-red-300 mt-1">{overdueInvoices.length} invoice{overdueInvoices.length !== 1 && 's'} require attention</p>
                                    <button
                                        onClick={() => setActiveView("sales")}
                                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all shadow-lg shadow-red-500/25"
                                    >
                                        View Invoices
                                        <ArrowUpRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {taskStats.pending > 0 && (
                        <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 shadow-lg shadow-amber-500/10">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
                            <div className="relative flex items-start gap-4">
                                <div className="p-3 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-500/30">
                                    <ClipboardList className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-lg text-amber-900 dark:text-amber-100">Pending Reviews</h4>
                                    <p className="text-amber-700 dark:text-amber-300 mt-1">{taskStats.pending} task{taskStats.pending !== 1 && 's'} awaiting approval</p>
                                    <button
                                        onClick={() => setActiveView("tasks")}
                                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/25"
                                    >
                                        Review Now
                                        <ArrowUpRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Premium Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Revenue Card */}
                <div className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl text-white shadow-lg shadow-emerald-500/30">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 rounded-full">YTD</span>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Revenue</p>
                        <p className="text-3xl font-bold text-foreground">ZMW {financeStats.revenueYTD.toLocaleString()}</p>
                    </div>
                </div>

                {/* Outstanding Card */}
                <div className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl text-white shadow-lg shadow-orange-500/30">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 px-3 py-1 rounded-full">{financeStats.outstandingCount} pending</span>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Outstanding</p>
                        <p className="text-3xl font-bold text-foreground">ZMW {financeStats.outstanding.toLocaleString()}</p>
                    </div>
                </div>

                {/* Pipeline Card */}
                <div className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl text-white shadow-lg shadow-blue-500/30">
                                <Target className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-3 py-1 rounded-full">Active</span>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Pipeline Deals</p>
                        <p className="text-3xl font-bold text-foreground">{pipelineStats.count}</p>
                        <p className="text-xs text-muted-foreground mt-1">Est. ZMW {pipelineStats.value.toLocaleString()}</p>
                    </div>
                </div>

                {/* Projects Card */}
                <div className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl text-white shadow-lg shadow-purple-500/30">
                                <Folder className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-3 py-1 rounded-full">In Progress</span>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Active Projects</p>
                        <p className="text-3xl font-bold text-foreground">{activeProjectsCount}</p>
                    </div>
                </div>
            </div>

            {/* Team & Top Performer Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Team Productivity */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold">Team Overview</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 text-center">
                            <p className="text-3xl font-bold text-foreground">{membersCount}</p>
                            <p className="text-sm text-muted-foreground mt-1">Active Members</p>
                        </div>
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 text-center">
                            <p className="text-3xl font-bold text-foreground">{taskStats.active}</p>
                            <p className="text-sm text-muted-foreground mt-1">Tasks In Progress</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-2xl p-5 text-center">
                            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{taskStats.completed}</p>
                            <p className="text-sm text-muted-foreground mt-1">Completed</p>
                        </div>
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 text-center">
                            <p className="text-3xl font-bold text-foreground">
                                {stats?.leaderboard ?
                                    Math.round(stats.leaderboard.reduce((acc: any, curr: any) => acc + curr.totalHours, 0)) + 'h'
                                    : '-'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">Hours Logged</p>
                        </div>
                    </div>
                </div>

                {/* Top Performer */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-8 text-white shadow-2xl shadow-emerald-500/30">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-400/20 rounded-full blur-xl" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-3xl">🏆</span>
                            <h3 className="text-xl font-bold">Top Performer</h3>
                        </div>

                        {stats?.bestPerformer ? (
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center text-3xl font-bold border border-white/30">
                                    {stats.bestPerformer.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-2xl font-bold">{stats.bestPerformer.name}</p>
                                    <p className="text-emerald-100 mt-1">{stats.bestPerformer.completedTasks} tasks completed</p>
                                    <div className="flex items-center gap-4 mt-3">
                                        <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                                            <p className="text-sm text-emerald-100">Hours</p>
                                            <p className="text-lg font-bold">{stats.bestPerformer.totalHours}h</p>
                                        </div>
                                        <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                                            <p className="text-sm text-emerald-100">Earned</p>
                                            <p className="text-lg font-bold">ZMW {stats.bestPerformer.totalEarnings.toFixed(0)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-emerald-100/60 italic">
                                No performance data available yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
