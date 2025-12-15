"use client"

import { useEffect, useState } from "react"
import { ClipboardList, CheckCircle, Users, BarChart3, FileText, Folder, AlertCircle, TrendingUp, DollarSign, Wallet } from "lucide-react"
import type { Invoice, Deal, Project } from "@/lib/types"
import Link from "next/link"
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
        // Fetch overdue invoices and calculate outstanding
        fetch('/api/invoices')
            .then(res => res.json())
            .then((data: Invoice[]) => {
                if (Array.isArray(data)) {
                    const overdue = data.filter(inv => inv.status === 'overdue')
                    const outstanding = data.filter(inv => inv.status === 'sent' || inv.status === 'overdue')

                    const outstandingAmount = outstanding.reduce((acc, inv) => acc + (inv.total || 0), 0)

                    setOverdueInvoices(overdue)
                    setFinanceStats(prev => ({
                        ...prev,
                        outstanding: outstandingAmount,
                        outstandingCount: outstanding.length
                    }))
                }
            })
            .catch(console.error)

        // Fetch Pipeline Stats
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

        // Fetch Payments for Revenue YTD
        fetch('/api/payments')
            .then(res => res.json())
            .then((data: any[]) => {
                if (Array.isArray(data)) {
                    // Simple YTD calculation
                    const currentYear = new Date().getFullYear()
                    const ytdPayments = data.filter(p => new Date(p.payment_date).getFullYear() === currentYear)
                    const revenue = ytdPayments.reduce((acc, p) => acc + (p.amount || 0), 0)
                    setFinanceStats(prev => ({ ...prev, revenueYTD: revenue }))
                }
            })
            .catch(console.error)

        // Fetch Active Projects Count
        const fetchProjects = async () => {
            const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active')
            setActiveProjectsCount(count || 0)
        }
        fetchProjects()

    }, [])

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Executive Summary</h2>

            {/* Operational Alerts Section */}
            {(overdueInvoices.length > 0 || taskStats.pending > 0) && (
                <div className="grid gap-4 md:grid-cols-2">
                    {overdueInvoices.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-bold">Overdue Invoices ({overdueInvoices.length})</h4>
                                <p className="text-sm mt-1">Action required for overdue payments.</p>
                                <button onClick={() => setActiveView("sales")} className="text-sm font-semibold underline mt-2">View Invoices</button>
                            </div>
                        </div>
                    )}
                    {taskStats.pending > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                                    <ClipboardList className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-amber-900">{taskStats.pending} Pending Task{taskStats.pending !== 1 ? 's' : ''}</h3>
                                    <p className="text-amber-700 text-sm">Approvals waiting for review.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveView("tasks")}
                                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                            >
                                Review
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenue Card */}
                <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Revenue (YTD)</h3>
                        <div className="p-2 bg-green-100 rounded-full text-green-600">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-foreground">ZMW {financeStats.revenueYTD.toLocaleString()}</p>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
                </div>

                {/* Outstanding Invoices */}
                <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Outstanding</h3>
                        <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-foreground">ZMW {financeStats.outstanding.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">{financeStats.outstandingCount} invoices pending payment</p>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-amber-500" />
                </div>

                {/* Sales Pipeline */}
                <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Active Pipeline</h3>
                        <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{pipelineStats.count}</p>
                    <p className="text-xs text-muted-foreground mt-1">Est. Value: ZMW {pipelineStats.value.toLocaleString()}</p>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
                </div>

                {/* Active Projects */}
                <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Active Projects</h3>
                        <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                            <Folder className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{activeProjectsCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Projects currently in progress</p>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-violet-500" />
                </div>
            </div>

            {/* Secondary Stats & Top Performer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team Productivity Card */}
                <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Team Overview
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/30 rounded-lg text-center">
                            <p className="text-2xl font-bold">{membersCount}</p>
                            <p className="text-xs text-muted-foreground">Active Members</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg text-center">
                            <p className="text-2xl font-bold">{taskStats.active}</p>
                            <p className="text-xs text-muted-foreground">Tasks In Progress</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg text-center">
                            <p className="text-2xl font-bold">{taskStats.completed}</p>
                            <p className="text-xs text-muted-foreground">Tasks Completed</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg text-center">
                            {/* Simple utilization metric if available, otherwise total hours from stats? 
                                Stats object has leaderboard, we can sum totals.
                            */}
                            <p className="text-xl font-bold">
                                {stats?.leaderboard ?
                                    Math.round(stats.leaderboard.reduce((acc: any, curr: any) => acc + curr.totalHours, 0)) + 'h'
                                    : '-'}
                            </p>
                            <p className="text-xs text-muted-foreground">Total Hours Logged</p>
                        </div>
                    </div>
                </div>

                {/* Top Performer Highlight */}
                <div className="glass-card rounded-2xl p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-green-900">Top Performer 🏆</h3>
                        {stats?.bestPerformer && (
                            <div className="text-right">
                                <p className="text-sm text-green-700 font-medium">Earnings</p>
                                <p className="text-xl font-bold text-green-800">ZMW {stats.bestPerformer.totalEarnings.toFixed(2)}</p>
                            </div>
                        )}
                    </div>

                    {stats?.bestPerformer ? (
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-green-200 flex items-center justify-center text-2xl font-bold text-green-700">
                                {stats.bestPerformer.name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-xl font-bold text-green-900">{stats.bestPerformer.name}</p>
                                <p className="text-green-700">{stats.bestPerformer.completedTasks} tasks completed</p>
                                <p className="text-sm text-green-600 mt-1">{stats.bestPerformer.totalHours} hours logged</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-green-800/50 italic">
                            No performance data available yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
