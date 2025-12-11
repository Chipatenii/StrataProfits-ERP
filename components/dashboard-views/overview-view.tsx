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
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-full text-amber-600">
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
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                    >
                        Review Requests
                    </button>
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Pending Requests Card */}
                <div className="glass-card rounded-2xl p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-amber-800">Pending Requests</h3>
                        <div className="p-2 bg-amber-200/50 rounded-full">
                            <ClipboardList className="w-5 h-5 text-amber-700" />
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <p className="text-3xl font-bold text-amber-900">{taskStats.pending}</p>
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
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Tasks</h3>
                        <ClipboardList className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold">{taskStats.total}</p>
                </div>
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Active Tasks</h3>
                        <ClipboardList className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-3xl font-bold">{taskStats.active}</p>
                </div>
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold">{taskStats.completed}</p>
                </div>
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Team Members</h3>
                        <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold">{membersCount}</p>
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
                                <p className="text-2xl font-bold">{stats.bestPerformer.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {stats.bestPerformer.completedTasks} tasks completed
                                </p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No data available</p>
                        )}
                    </div>

                    <div className="glass-card rounded-2xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Team Earnings Leaderboard</h3>
                        <div className="space-y-3">
                            {stats.leaderboard.slice(0, 5).map((member: any, index: number) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-muted-foreground w-4">{index + 1}</span>
                                        <span className="font-medium">{member.name}</span>
                                    </div>
                                    <span className="text-green-600 font-semibold">ZMW {member.totalEarnings.toFixed(2)}</span>
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
                        <FileText className="w-6 h-6 text-blue-600" />
                        <div>
                            <p className="font-medium text-blue-900">Monthly Reports</p>
                            <p className="text-sm text-blue-700">View detailed team reports</p>
                        </div>
                    </Link>
                    <button
                        onClick={() => setActiveView("clients")}
                        className="flex items-center gap-3 p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors border border-green-200"
                    >
                        <Folder className="w-6 h-6 text-green-600" />
                        <div>
                            <p className="font-medium text-green-900">Clients & Projects</p>
                            <p className="text-sm text-green-700">Manage agency clients</p>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveView("tasks")}
                        className="flex items-center gap-3 p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-200"
                    >
                        <ClipboardList className="w-6 h-6 text-purple-600" />
                        <div>
                            <p className="font-medium text-purple-900">Manage Tasks</p>
                            <p className="text-sm text-purple-700">Create and assign tasks</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    )
}
