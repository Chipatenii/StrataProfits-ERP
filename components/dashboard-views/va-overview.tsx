"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle, Clock } from "lucide-react"
import { Task, Invoice, Meeting, UserProfile } from "@/lib/types"
import { TaskDetailModal } from "@/components/modals/task-detail-modal"
import { getTimeBasedGreeting, getFormattedDate, getFormattedTime } from "@/lib/time-utils"

interface VAOverviewProps {
    userName: string
    userId: string
    onViewChange?: (view: string) => void
}

export function VAOverview({ userName, userId, onViewChange }: VAOverviewProps) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [overdueInvoices, setOverdueInvoices] = useState<Invoice[]>([])
    const [meetings, setMeetings] = useState<Meeting[]>([])
    const [stats, setStats] = useState({ leads: 0, proposals: 0 })
    const [currentTime, setCurrentTime] = useState(new Date())
    const [members, setMembers] = useState<UserProfile[]>([])
    const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    const handleCardClick = (task: Task) => {
        setSelectedTaskDetail(task)
        setIsDetailModalOpen(true)
    }

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch tasks
                const tasksRes = await fetch(`/api/tasks?assignee_id=${userId}&status=pending`)
                if (tasksRes.ok) {
                    const data = await tasksRes.json()
                    if (Array.isArray(data)) setTasks(data.slice(0, 5))
                }

                // Fetch overdue invoices
                const invoicesRes = await fetch('/api/invoices?status=overdue')
                if (invoicesRes.ok) {
                    const data = await invoicesRes.json()
                    if (Array.isArray(data)) setOverdueInvoices(data)
                }

                // Fetch pipeline stats
                const dealsRes = await fetch('/api/admin/deals')
                if (dealsRes.ok) {
                    const data = await dealsRes.json()
                    if (Array.isArray(data)) {
                        const now = new Date();
                        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        const newLeads = data.filter((d: any) => new Date(d.created_at) > oneWeekAgo).length;
                        const proposals = data.filter((d: any) => d.stage === 'Proposal').length;
                        setStats({ leads: newLeads, proposals });
                    }
                }

                // Fetch today's meetings
                const today = new Date().toISOString().split('T')[0]
                const meetingsRes = await fetch(`/api/meetings?date=${today}`)
                if (meetingsRes.ok) {
                    const data = await meetingsRes.json()
                    if (Array.isArray(data)) setMeetings(data)
                }

                // Fetch members for detail modal
                const membersRes = await fetch('/api/admin/members')
                if (membersRes.ok) {
                    const data = await membersRes.json()
                    if (Array.isArray(data)) setMembers(data)
                }
            } catch (error) {
                console.error("Error fetching VA overview data:", error)
            }
        }

        fetchData()
    }, [userId])

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{getTimeBasedGreeting(userName)}</h2>
                    <p className="text-muted-foreground">
                        {getFormattedDate()} • <span className="font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{getFormattedTime()}</span>
                    </p>
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

            <div className="grid gap-6 md:grid-cols-2">
                {/* Today's Tasks */}
                <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">Today's Priorities</h3>
                        <button onClick={() => onViewChange?.('tasks')} className="text-xs text-blue-600 hover:underline">View All</button>
                    </div>
                    <div className="space-y-3">
                        {tasks.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-4 text-center border-dashed border-2 rounded-lg">No pending tasks for today.</p>
                        ) : (
                            tasks.map(task => (
                                <button
                                    key={task.id}
                                    onClick={() => handleCardClick(task)}
                                    className="w-full flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                        <span className="font-medium group-hover:text-primary transition-colors truncate max-w-[150px]">{task.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {task.due_date && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(task.due_date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Today's Meetings */}
                <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">Upcoming Meetings</h3>
                        <button onClick={() => onViewChange?.('meetings')} className="text-xs text-blue-600 hover:underline">Full Schedule</button>
                    </div>
                    <div className="space-y-3">
                        {meetings.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-4 text-center border-dashed border-2 rounded-lg">No meetings scheduled today.</p>
                        ) : (
                            meetings.map(meeting => (
                                <div
                                    key={meeting.id}
                                    className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm">{meeting.title}</span>
                                        <span className="text-xs text-muted-foreground">{meeting.mode} • {meeting.client?.name || 'In-House'}</span>
                                    </div>
                                    <div className="text-xs font-mono text-blue-700 bg-white px-2 py-1 rounded shadow-sm">
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
