"use client"

import { ClipboardList, CheckCircle, Users, BarChart3, FileText, Folder } from "lucide-react"
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
    return (
        <div className="space-y-6">
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

            {/* Quick Actions */}
            <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                        href="/reports"
                        className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                        <FileText className="w-6 h-6 text-blue-600 shrink-0" />
                        <div className="overflow-hidden">
                            <p className="font-medium text-blue-900 truncate">Monthly Reports</p>
                            <p className="text-sm text-blue-700 truncate">View detailed team reports</p>
                        </div>
                    </Link>
                    <button
                        onClick={() => setActiveView("clients")}
                        className="flex items-center gap-3 p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors border border-green-200 text-left"
                    >
                        <Folder className="w-6 h-6 text-green-600 shrink-0" />
                        <div className="overflow-hidden">
                            <p className="font-medium text-green-900 truncate">Clients & Projects</p>
                            <p className="text-sm text-green-700 truncate">Manage agency clients</p>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveView("tasks")}
                        className="flex items-center gap-3 p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-200 text-left"
                    >
                        <ClipboardList className="w-6 h-6 text-purple-600 shrink-0" />
                        <div className="overflow-hidden">
                            <p className="font-medium text-purple-900 truncate">Manage Tasks</p>
                            <p className="text-sm text-purple-700 truncate">Create and assign tasks</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    )
}
