"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle, Clock } from "lucide-react"
import { Task, Invoice } from "@/lib/types"
import { getTimeBasedGreeting } from "@/lib/time-utils"


interface VAOverviewProps {
    userName: string
    userId: string
}

export function VAOverview({ userName, userId }: VAOverviewProps) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [overdueInvoices, setOverdueInvoices] = useState<Invoice[]>([])
    const [stats, setStats] = useState({ leads: 0, proposals: 0 })

    useEffect(() => {
        // Fetch tasks
        // This is a simplified fetch, normally we'd allow filtering logic
        fetch(`/api/tasks?assignee_id=${userId}&status=pending`) // Assuming this route exists and filters
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setTasks(data.slice(0, 5)) // Top 5
            })
            .catch(console.error)

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

                    setStats({ leads: newLeads, proposals });
                }
            })
            .catch(console.error)
    }, [userId])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{getTimeBasedGreeting(userName)}</h2>
                    <p className="text-muted-foreground">Here's what's happening in Operations today.</p>
                </div>
            </div>

            {/* Alerts Section */}
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="glass-card p-6 rounded-xl">
                    <div className="text-sm font-medium text-muted-foreground">New Leads (Week)</div>
                    <div className="text-2xl font-bold mt-2">{stats.leads}</div>
                </div>
                <div className="glass-card p-6 rounded-xl">
                    <div className="text-sm font-medium text-muted-foreground">Proposals Sent</div>
                    <div className="text-2xl font-bold mt-2">{stats.proposals}</div>
                </div>
                <div className="glass-card p-6 rounded-xl">
                    <div className="text-sm font-medium text-muted-foreground">Pending Tasks</div>
                    <div className="text-2xl font-bold mt-2">{tasks.length}</div>
                </div>
                <div className="glass-card p-6 rounded-xl">
                    <div className="text-sm font-medium text-muted-foreground">Urgent Invoices</div>
                    <div className="text-2xl font-bold mt-2 text-red-600">{overdueInvoices.length}</div>
                </div>
            </div>

            <div className="glass-card p-6 rounded-xl">
                <h3 className="font-semibold text-lg mb-4">Today's Priorities</h3>
                <div className="space-y-3">
                    {tasks.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No pending tasks found.</p>
                    ) : (
                        tasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                    <span className="font-medium">{task.title}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    {task.due_date && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(task.due_date).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
