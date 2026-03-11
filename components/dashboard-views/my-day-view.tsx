"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { Sun, CheckCircle, Clock, AlertCircle, Calendar as CalendarIcon, Zap, Star, Play, Pause } from "lucide-react"
import { Task, Meeting, UserProfile, TimeLog } from "@/lib/types"
import { TaskDetailModal } from "@/components/modals/task-detail-modal"
import { TaskCompletionModal } from "@/components/modals/task-completion-modal"
import { Timer } from "@/components/timer"
import { getTimeBasedGreeting, calculateTimeSpent } from "@/lib/time-utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"


interface MyDayViewProps {
    userId: string
    userName: string
}

export function MyDayView({ userId, userName }: MyDayViewProps) {
    const supabase = createClient()
    const [showCompleteModal, setShowCompleteModal] = useState(false)
    const [completingTask, setCompletingTask] = useState<Task | null>(null)
    const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    const handleCardClick = (task: Task) => {
        setSelectedTaskDetail(task)
        setIsDetailModalOpen(true)
    }

    const fetchMyDayData = async () => {
        const [tasksRes, meetingsRes, membersRes] = await Promise.all([
            fetch(`/api/tasks?assignee_id=${userId}`),
            fetch(`/api/meetings`),
            fetch(`/api/admin/members`)
        ])

        let myTasks: Task[] = []
        if (tasksRes.ok) {
            const allTasks: Task[] = await tasksRes.json()
            myTasks = Array.isArray(allTasks) ? allTasks.filter(t => t.status !== 'completed' && t.status !== 'verified') : []
        } else {
            const fallback = await fetch(`/api/admin/tasks`)
            if (fallback.ok) {
                const allTasks: Task[] = await fallback.json()
                myTasks = allTasks.filter((t: any) => t.assigned_to === userId && t.status !== 'completed')
            }
        }

        let fetchedMeetings: Meeting[] = []
        if (meetingsRes.ok) fetchedMeetings = await meetingsRes.json()

        let fetchedMembers: UserProfile[] = []
        if (membersRes.ok) fetchedMembers = await membersRes.json()

        const today = new Date().toISOString().split('T')[0]
        const { data: logs } = await supabase
            .from('time_logs')
            .select('*')
            .eq('user_id', userId)
            .gte('clock_in', today)

        return {
            tasks: myTasks || [],
            meetings: fetchedMeetings || [],
            members: fetchedMembers || [],
            timeLogs: logs || []
        }
    }

    const { data: dayData, isLoading: loading, mutate } = useSWR(['my-day-data', userId], fetchMyDayData)

    const tasks = dayData?.tasks || []
    const meetings = dayData?.meetings || []
    const members = dayData?.members || []
    const timeLogs = dayData?.timeLogs || []
    const activeLog = timeLogs.find((l: TimeLog) => !l.clock_out)
    const activeTaskId = activeLog?.task_id || null
    const activeClockIn = activeLog?.clock_in || null
    const isClockedIn = !!activeLog

    const handleTaskStartStop = useCallback(async (taskId: string) => {
        try {
            const activeLog = timeLogs.find((log) => !log.clock_out)

            if (activeLog?.task_id === taskId) {
                // Stop tracking current task
                const clockOut = new Date().toISOString()
                const clockIn = new Date(activeLog.clock_in)
                const durationMinutes = Math.round((new Date(clockOut).getTime() - clockIn.getTime()) / 60000)

                mutate({ ...dayData, timeLogs: (dayData?.timeLogs || []).map((log: any) => log.id === activeLog.id ? { ...log, clock_out: clockOut, duration_minutes: durationMinutes } : log) } as any, false)

                await supabase.from("time_logs").update({ clock_out: clockOut, duration_minutes: durationMinutes }).eq("id", activeLog.id)
                toast.success('Timer stopped')
            } else {
                // Stop previous if exists
                if (activeLog) {
                    const clockOut = new Date().toISOString()
                    const clockIn = new Date(activeLog.clock_in)
                    const durationMinutes = Math.round((new Date(clockOut).getTime() - clockIn.getTime()) / 60000)
                    await supabase.from("time_logs").update({ clock_out: clockOut, duration_minutes: durationMinutes }).eq("id", activeLog.id)
                }

                // Start new log
                const now = new Date().toISOString()

                // Optimistic SWR update
                const newLog = { id: Date.now().toString(), user_id: userId, task_id: taskId, clock_in: now }
                const updatedLogs = [...(dayData?.timeLogs || []).filter((l: any) => l.id !== activeLog?.id), ...(activeLog ? [{...activeLog, clock_out: new Date().toISOString(), duration_minutes: 0}] : []), newLog]
                mutate({ ...dayData, timeLogs: updatedLogs } as any, false)

                const { data, error } = await supabase.from("time_logs").insert({
                    user_id: userId,
                    task_id: taskId,
                    clock_in: now,
                }).select().single()
                
                if (error) throw error
                // Real update
                mutate({ ...dayData, timeLogs: [...(dayData?.timeLogs || []).filter((l: any) => l.id !== activeLog?.id && l.id !== newLog.id), ...(activeLog ? [{...activeLog, clock_out: new Date().toISOString(), duration_minutes: 0}] : []), data] } as any, false)
                toast.success('Timer started for task')
            }
        } catch (error) {
            const e = error as Error;
            console.error(e)
            toast.error('Failed to toggle timer')
            mutate() // revert optimistic UI on fail
        }
    }, [timeLogs, userId, supabase, mutate])

    const handleTaskComplete = async (notes: string, timeAllocated: number) => {
        if (!completingTask) return

        try {
            if (activeTaskId === completingTask.id) {
                await handleTaskStartStop(completingTask.id)
            }

            const response = await fetch(`/api/admin/tasks?id=${completingTask.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "completed",
                    completion_notes: notes,
                    time_allocated: timeAllocated,
                    completed_at: new Date().toISOString()
                })
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || "Failed to complete task")
            }

            setShowCompleteModal(false)
            setCompletingTask(null)
            mutate()
            toast.success("Task completed successfully!")
        } catch (error) {
            const e = error as Error;
            console.error("Task completion error:", e)
            toast.error(e.message || "Failed to complete task.")
        }
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-12 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading your day...</p>
        </div>
    )

    const todayStr = new Date().toISOString().split('T')[0]
    const dueToday = tasks.filter(t => t.due_date && t.due_date.startsWith(todayStr))
    const overdue = tasks.filter(t => t.due_date && t.due_date < todayStr)
    const highPriority = tasks.filter(t => t.priority === 'high' && !dueToday.includes(t) && !overdue.includes(t))
    const todaysMeetings = meetings.filter(m => m.date_time_start.startsWith(todayStr))

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-10 text-white shadow-2xl shadow-primary/30">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-indigo-300/10 rounded-full blur-xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Sun className="w-5 h-5 text-amber-300" />
                        <span className="text-sm font-medium text-violet-200 uppercase tracking-wider">My Day</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">{getTimeBasedGreeting(userName)}</h1>
                    <p className="text-violet-100/80 text-lg">Here's your focus for today. Let's make it count!</p>
                </div>

                {/* Quick Stats in Hero */}
                <div className="relative z-10 grid grid-cols-3 gap-4 mt-8">
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{dueToday.length}</p>
                        <p className="text-sm text-violet-100/80">Due Today</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{todaysMeetings.length}</p>
                        <p className="text-sm text-violet-100/80">Meetings</p>
                    </div>
                    <div className={`backdrop-blur-lg rounded-2xl p-4 border text-center ${overdue.length > 0 ? 'bg-red-500/30 border-red-400/40' : 'bg-white/15 border-white/20'}`}>
                        <p className="text-3xl font-bold">{overdue.length}</p>
                        <p className="text-sm text-violet-100/80">Overdue</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: TASKS */}
                <div className="lg:col-span-2 space-y-6">

                    {/* OVERDUE WARNING */}
                    {overdue.length > 0 && (
                        <div className="relative overflow-hidden bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-3xl p-6 shadow-xl shadow-red-500/10">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl" />
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-red-500 rounded-2xl text-white shadow-lg shadow-red-500/30">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-red-900 dark:text-red-100">Overdue Tasks</h3>
                                        <p className="text-sm text-red-700 dark:text-red-300">{overdue.length} task{overdue.length !== 1 && 's'} need attention</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {overdue.map(t => (
                                        <div
                                            key={t.id}
                                            onClick={() => handleCardClick(t)}
                                            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-red-100 dark:border-red-900/50 flex justify-between items-center shadow-md cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all min-h-[56px]"
                                        >
                                            <span className="font-medium text-foreground truncate mr-2">{t.title}</span>
                                            <span className="text-xs text-red-600 dark:text-red-400 font-semibold whitespace-nowrap bg-red-100 dark:bg-red-900/50 px-3 py-1 rounded-full">
                                                {new Date(t.due_date!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DUE TODAY */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Due Today</h3>
                        </div>

                        {dueToday.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                                <Star className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                                <p className="text-muted-foreground font-medium">No tasks specifically due today.</p>
                                <p className="text-sm text-muted-foreground mt-1">Great job staying on top of things! 🎉</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {dueToday.map(t => {
                                    const isTaskActive = activeTaskId === t.id
                                    const previousLogs = timeLogs.filter(l => l.task_id === t.id && l.clock_out)
                                    const initialSeconds = previousLogs.reduce((acc, log) => acc + (log.duration_minutes || 0) * 60, 0)
                                    
                                    return (
                                    <div
                                        key={t.id}
                                        onClick={() => handleCardClick(t)}
                                        className={`group relative p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all border ${isTaskActive ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-emerald-200 dark:hover:border-emerald-800'}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-lg text-foreground truncate">{t.title}</h4>
                                                {isTaskActive && (
                                                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded-full font-bold animate-pulse">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                        TRACKING
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mr-2">{t.project_id ? "Project Task" : "General Task"}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isTaskActive && (
                                                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm mr-2">
                                                    <Timer
                                                        isActive={isTaskActive}
                                                        startTime={activeClockIn}
                                                        initialSeconds={initialSeconds}
                                                        estimatedHours={t.estimated_hours || undefined}
                                                    />
                                                </div>
                                            )}
                                            <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${t.priority === 'high'
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                {t.priority}
                                            </span>
                                            
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleTaskStartStop(t.id)
                                                }}
                                                className={`p-2 rounded-xl transition-all ${isTaskActive
                                                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                                                }`}
                                            >
                                                {isTaskActive ? <Pause size={18} /> : <Play size={18} />}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setCompletingTask(t)
                                                    setShowCompleteModal(true)
                                                }}
                                                className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-all"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        )}
                    </div>

                    {/* HIGH PRIORITY */}
                    {highPriority.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
                                    <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground">High Priority Backlog</h3>
                            </div>
                            <div className="space-y-3">
                                {highPriority.map(t => {
                                    const isTaskActive = activeTaskId === t.id
                                    const previousLogs = timeLogs.filter(l => l.task_id === t.id && l.clock_out)
                                    const initialSeconds = previousLogs.reduce((acc, log) => acc + (log.duration_minutes || 0) * 60, 0)

                                    return (
                                    <div
                                        key={t.id}
                                        onClick={() => handleCardClick(t)}
                                        className={`p-4 rounded-2xl flex justify-between items-center cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all min-h-[56px] border ${isTaskActive ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50'}`}
                                    >
                                        <div className="flex items-center gap-2 truncate mr-2">
                                            <span className="font-medium text-foreground truncate">{t.title}</span>
                                            {isTaskActive && (
                                                <span className="flex shrink-0 items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] rounded-full font-bold animate-pulse mt-0.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                    ON
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white shadow-md shadow-amber-500/25">
                                                High
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleTaskStartStop(t.id)
                                                }}
                                                className={`p-1.5 rounded-lg transition-all ${isTaskActive
                                                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                                                }`}
                                            >
                                                {isTaskActive ? <Pause size={16} /> : <Play size={16} />}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setCompletingTask(t)
                                                    setShowCompleteModal(true)
                                                }}
                                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-all"
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: SCHEDULE */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-violet-100 dark:bg-violet-900/50 rounded-xl">
                                <CalendarIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Today's Schedule</h3>
                        </div>

                        {todaysMeetings.length === 0 ? (
                            <div className="p-6 text-center bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">No meetings scheduled for today.</p>
                            </div>
                        ) : (
                            <div className="relative border-l-2 border-violet-200 dark:border-violet-800 ml-3 space-y-6 pl-6 py-2">
                                {todaysMeetings.map(m => (
                                    <div key={m.id} className="relative group">
                                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-violet-500 ring-4 ring-white dark:ring-slate-900 shadow-lg"></div>
                                        <div className="bg-violet-50 dark:bg-violet-950/30 rounded-2xl p-4 border border-violet-100 dark:border-violet-900/50 group-hover:shadow-md transition-shadow">
                                            <p className="text-xs font-bold text-violet-600 dark:text-violet-400 mb-1">
                                                {new Date(m.date_time_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <h4 className="font-bold text-foreground leading-tight">{m.title}</h4>
                                            <p className="text-xs text-muted-foreground mt-1 capitalize">{m.mode}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Time Tracking Widget */}
                    <div className="relative overflow-hidden bg-emerald-500 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/25">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="w-5 h-5" />
                                <h3 className="font-bold">Time Tracking</h3>
                            </div>
                            {isClockedIn && activeClockIn ? (
                                <div className="mb-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                        <span className="text-xs text-emerald-100 font-medium">Currently tracking</span>
                                    </div>
                                    <div className="text-2xl font-mono font-bold flex items-center gap-3">
                                        <Timer isActive={true} startTime={activeClockIn} />
                                        {activeTaskId && (
                                            <button 
                                                onClick={() => handleTaskStartStop(activeTaskId)}
                                                className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors"
                                            >
                                                <Pause className="w-4 h-4 text-white" />
                                            </button>
                                        )}
                                    </div>
                                    {activeTaskId && (
                                        <p className="text-xs text-emerald-100 mt-2 truncate">
                                            Task: {tasks.find(t => t.id === activeTaskId)?.title || 'Unknown'}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="mb-3">
                                    <p className="text-emerald-100/90 text-sm font-medium">No active timer running.</p>
                                    <p className="text-emerald-100/70 text-xs mt-1">Start a timer from a specific task in your task list to track productivity.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <TaskDetailModal
                open={isDetailModalOpen}
                task={selectedTaskDetail}
                members={members}
                onOpenChange={setIsDetailModalOpen}
            />
            <TaskCompletionModal
                isOpen={showCompleteModal}
                onClose={() => {
                    setShowCompleteModal(false)
                    setCompletingTask(null)
                }}
                onComplete={handleTaskComplete}
                taskTitle={completingTask?.title || ""}
                spentMinutes={completingTask ? calculateTimeSpent(timeLogs as any[], completingTask.id) : 0}
                estimatedHours={completingTask?.estimated_hours || undefined}
            />
        </div>
    )
}
