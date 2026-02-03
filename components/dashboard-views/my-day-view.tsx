"use client"

import { useState, useEffect } from "react"
import { Sun, CheckCircle, Clock, AlertCircle, Calendar as CalendarIcon } from "lucide-react"
import { Task, Meeting, UserProfile } from "@/lib/types"
import { TaskDetailModal } from "@/components/modals/task-detail-modal"
import { getTimeBasedGreeting } from "@/lib/time-utils"


interface MyDayViewProps {
    userId: string
    userName: string
}

export function MyDayView({ userId, userName }: MyDayViewProps) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [meetings, setMeetings] = useState<Meeting[]>([])
    const [loading, setLoading] = useState(true)
    const [members, setMembers] = useState<UserProfile[]>([])
    const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    const handleCardClick = (task: Task) => {
        setSelectedTaskDetail(task)
        setIsDetailModalOpen(true)
    }

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
                // Parallel fetch
                const [tasksRes, meetingsRes, membersRes] = await Promise.all([
                    fetch(`/api/admin/tasks`),
                    fetch(`/api/meetings`),
                    fetch(`/api/admin/members`)
                ])

                if (tasksRes.ok) {
                    const allTasks: Task[] = await tasksRes.json()
                    // Filter for "Me"
                    const myTasks = allTasks.filter(t => t.assigned_to === userId && t.status !== 'completed')
                    setTasks(myTasks)
                }

                if (meetingsRes.ok) {
                    const allMeetings: Meeting[] = await meetingsRes.json()
                    setMeetings(allMeetings)
                }

                if (membersRes.ok) {
                    const allMembers: UserProfile[] = await membersRes.json()
                    setMembers(allMembers)
                }

            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [userId])

    // Logic: Due Today or Overdue
    const todayStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    const dueToday = tasks.filter(t => t.due_date && t.due_date.startsWith(todayStr))
    const overdue = tasks.filter(t => t.due_date && t.due_date < todayStr)
    const highPriority = tasks.filter(t => t.priority === 'high' && !dueToday.includes(t) && !overdue.includes(t))

    const todaysMeetings = meetings.filter(m => m.date_time_start.startsWith(todayStr))

    if (loading) return (
        <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    )

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl text-white shadow-lg shadow-emerald-500/25 shrink-0">
                    <Sun className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent leading-tight">
                        {getTimeBasedGreeting(userName)}
                    </h2>
                    <p className="text-sm md:text-base text-muted-foreground">Here's your focus for today.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN: TASKS */}
                <div className="lg:col-span-2 space-y-6">

                    {/* OVERDUE WARNING */}
                    {overdue.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-5">
                            <h3 className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold mb-4">
                                <AlertCircle className="w-5 h-5" /> Overdue Tasks ({overdue.length})
                            </h3>
                            <div className="space-y-2">
                                {overdue.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => handleCardClick(t)}
                                        className="bg-white dark:bg-card p-4 rounded-xl border border-red-100 dark:border-red-900 flex justify-between items-center shadow-sm cursor-pointer hover:border-red-300 dark:hover:border-red-700 transition-all active:scale-[0.99] min-h-[52px]"
                                    >
                                        <span className="font-medium text-foreground truncate mr-2">{t.title}</span>
                                        <span className="text-xs text-red-600 dark:text-red-400 font-semibold whitespace-nowrap">{t.due_date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DUE TODAY */}
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-bold mb-4 text-foreground">
                            <CheckCircle className="w-5 h-5 text-primary" /> Due Today
                        </h3>
                        {dueToday.length === 0 ? (
                            <div className="p-8 text-center glass-card rounded-2xl border border-dashed border-border text-muted-foreground">
                                No tasks specifically due today. Great job! 🎉
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {dueToday.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => handleCardClick(t)}
                                        className="glass-card-hover p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer"
                                    >
                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-lg text-foreground truncate">{t.title}</h4>
                                            <p className="text-sm text-muted-foreground">{t.project_id ? "Project Task" : "General Task"}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`badge ${t.priority === 'high' ? 'badge-warning' : 'badge-neutral'}`}>
                                                {t.priority}
                                            </span>
                                            <span className="badge badge-info">
                                                {t.estimated_hours ? `${t.estimated_hours}h` : 'No est.'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* HIGH PRIORITY */}
                    {highPriority.length > 0 && (
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-bold mb-4 text-foreground mt-6">
                                <AlertCircle className="w-5 h-5 text-amber-500" /> High Priority Backlog
                            </h3>
                            <div className="space-y-3">
                                {highPriority.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => handleCardClick(t)}
                                        className="glass-card-hover p-4 rounded-xl flex justify-between items-center cursor-pointer min-h-[52px]"
                                    >
                                        <span className="font-medium text-foreground truncate mr-2">{t.title}</span>
                                        <span className="badge badge-warning">High</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: SCHEDULE */}
                <div className="space-y-6">
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="flex items-center gap-2 font-bold text-foreground mb-4">
                            <CalendarIcon className="w-5 h-5 text-violet-500" /> Today's Schedule
                        </h3>
                        {todaysMeetings.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No meetings scheduled for today.</p>
                        ) : (
                            <div className="relative border-l-2 border-violet-200 dark:border-violet-800 ml-2 space-y-6 pl-6 py-2">
                                {todaysMeetings.map(m => (
                                    <div key={m.id} className="relative">
                                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-violet-500 ring-4 ring-card"></div>
                                        <p className="text-xs font-bold text-violet-600 dark:text-violet-400 mb-1">
                                            {new Date(m.date_time_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <h4 className="font-bold text-sm leading-tight text-foreground">{m.title}</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">{m.mode}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Time Tracking Widget Summary */}
                    <div className="glass-card p-6 rounded-2xl hidden lg:block">
                        <h3 className="flex items-center gap-2 font-bold text-foreground mb-2">
                            <Clock className="w-5 h-5 text-emerald-500" /> Time Tracked
                        </h3>
                        <p className="text-sm text-muted-foreground">See dashboard for details</p>
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
