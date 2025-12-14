"use client"

import { useEffect, useState } from "react"
import { ClipboardList, CheckCircle, Users, BarChart3, FileText, Folder, AlertCircle } from "lucide-react"
import type { Invoice } from "@/lib/types"
import Link from "next/link"

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
    const [pipelineStats, setPipelineStats] = useState({ leads: 0, proposals: 0 })

    useEffect(() => {
        // Fetch overdue invoices
        fetch('/api/invoices?status=overdue')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setOverdueInvoices(data)
            })
            .catch(console.error)

        // Fetch pipeline stats
        fetch('/api/admin/deals')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    // Calculate stats
                    const now = new Date();
                    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

                    const newLeads = data.filter(d => new Date(d.created_at) > oneWeekAgo).length;
                    const proposals = data.filter(d => d.stage === 'Proposal').length;

                    setPipelineStats({ leads: newLeads, proposals });
                }
            })
            .catch(console.error)
    }, [])

    return (
        <div className="space-y-6">
            {/* Operational Alerts Section */}
            {(overdueInvoices.length > 0) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 mt-0.5" />
                    <div>
                        <h4 className="font-semibold">Attention Needed</h4>
                        <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                            {overdueInvoices.map(inv => (
                                <li key={inv.id}>
                                    Invoice {inv.invoice_number || 'Unknown'} for {inv.client?.name || 'Client'} is Overdue.
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            {/* Task Requests Alert */}
            {taskStats.pending > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full">
                        <div className="p-2 bg-amber-100 rounded-full text-amber-600 shrink-0">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-amber-900">Pending Task Approvals</h3>
                            <p className="text-amber-700 text-sm">
                                You have {taskStats.pending} task request{taskStats.pending !== 1 ? "s" : ""} to review.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setActiveView("tasks")}
                        className="w-full sm:w-auto px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                    >
                        Review Requests
                    </button>
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Pipeline Stats */}
                <div className="glass-card rounded-2xl p-4 md:p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">New Leads (Wk)</h3>
                        <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold">{pipelineStats.leads}</p>
                </div>
                <div className="glass-card rounded-2xl p-4 md:p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Proposals</h3>
                        <FileText className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold">{pipelineStats.proposals}</p>
                </div>
                {/* Pending Requests Card - Full width on mobile if pending > 0, else follows grid */}
                <div className={`glass-card rounded-2xl p-4 md:p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 ${taskStats.pending > 0 ? "col-span-2 md:col-span-1" : ""}`}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-amber-800">Pending</h3>
                        <div className="p-1.5 md:p-2 bg-amber-200/50 rounded-full">
                            <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-amber-700" />
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <p className="text-2xl md:text-3xl font-bold text-amber-900">{taskStats.pending}</p>
                        {taskStats.pending > 0 && (
                            <button
                                onClick={() => setActiveView("tasks")}
                                className="text-xs font-semibold px-2 py-1 bg-amber-200/80 text-amber-800 rounded hover:bg-amber-300 transition-colors"
                            >
                                Review &rarr;
                            </button>
                        )}
                    </div>
                </div>
                <div className="glass-card rounded-2xl p-4 md:p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Total</h3>
                        <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold">{taskStats.total}</p>
                </div>
                <div className="glass-card rounded-2xl p-4 md:p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Active</h3>
                        <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold">{taskStats.active}</p>
                </div>
                <div className="glass-card rounded-2xl p-4 md:p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Done</h3>
                        <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold">{taskStats.completed}</p>
                </div>
                {/* Team count - visible on larger screens or as extra */}
                <div className="glass-card rounded-2xl p-4 md:p-6 col-span-2 md:col-span-1 md:hidden lg:block">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Team</h3>
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold">{membersCount}</p>
                </div>
            </div>

            {/* Analytics Section */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Best Performer</h3>
                            <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                        </div>
                        {stats.bestPerformer ? (
                            <div>
                                <p className="text-2xl font-bold truncate">{stats.bestPerformer.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {stats.bestPerformer.completedTasks} tasks completed
                                </p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No data available</p>
                        )}
                    </div>

                    <div className="glass-card rounded-2xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Team Leaderboard</h3>
                        <div className="space-y-3">
                            {stats.leaderboard.slice(0, 5).map((member: any, index: number) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <span className="text-sm font-medium text-muted-foreground w-4 shrink-0">{index + 1}</span>
                                        <span className="font-medium truncate">{member.name}</span>
                                    </div>
                                    <span className="text-green-600 font-semibold shrink-0 whitespace-nowrap ml-2">ZMW {member.totalEarnings.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}


        </div>
    )
}
