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
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading your day...</p>
        </div>
    )

    const todayStr = new Date().toISOString().split('T')[0]
    const dueToday = tasks.filter(t => t.due_date && t.due_date.startsWith(todayStr))
    const overdue = tasks.filter(t => t.due_date && t.due_date < todayStr)
    const highPriority = tasks.filter(t => t.priority === 'high' && !dueToday.includes(t) && !overdue.includes(t))
    const todaysMeetings = meetings.filter(m => m.date_time_start.startsWith(todayStr))

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">My day</span>
                </div>
                <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">{getTimeBasedGreeting(userName)}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Here&apos;s your focus for today. Let&apos;s make it count.</p>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Due today</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{dueToday.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Meetings</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{todaysMeetings.length}</p>
                </div>
                <div className={`rounded-xl p-4 border ${overdue.length > 0 ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/40' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'}`}>
                    <p className={`text-xs font-medium uppercase tracking-wide ${overdue.length > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>Overdue</p>
                    <p className={`text-2xl font-bold mt-1 ${overdue.length > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white'}`}>{overdue.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* LEFT COLUMN: TASKS */}
                <div className="lg:col-span-2 space-y-4">

                    {/* OVERDUE */}
                    {overdue.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-rose-600" />
                                    <h3 className="font-semibold text-base text-slate-900 dark:text-white">Overdue tasks</h3>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">· {overdue.length} need attention</span>
                                </div>
                            </div>
                            <div className="p-3 space-y-2">
                                {overdue.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => handleCardClick(t)}
                                        className="bg-rose-50 dark:bg-rose-950/20 p-3 rounded-lg border border-rose-100 dark:border-rose-900/40 flex justify-between items-center cursor-pointer hover:border-rose-300 transition-colors"
                                    >
                                        <span className="font-medium text-sm text-slate-900 dark:text-white truncate mr-2">{t.title}</span>
                                        <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold whitespace-nowrap bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-md">
                                            {new Date(t.due_date!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DUE TODAY */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-700" />
                                <h3 className="font-semibold text-base text-slate-900 dark:text-white">Due today</h3>
                            </div>
                        </div>

                        {dueToday.length === 0 ? (
                            <div className="p-8 text-center">
                                <Star className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">No tasks specifically due today.</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Great job staying on top of things.</p>
                            </div>
                        ) : (
                            <div className="p-3 space-y-2">
                                {dueToday.map(t => {
                                    const isTaskActive = activeTaskId === t.id
                                    const previousLogs = timeLogs.filter(l => l.task_id === t.id && l.clock_out)
                                    const initialSeconds = previousLogs.reduce((acc, log) => acc + (log.duration_minutes || 0) * 60, 0)

                                    return (
                                    <div
                                        key={t.id}
                                        onClick={() => handleCardClick(t)}
                                        className={`p-4 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer transition-colors border ${isTaskActive ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-emerald-300'}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{t.title}</h4>
                                                {isTaskActive && (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded font-semibold animate-pulse">
                                                        <div className="w-1 h-1 rounded-full bg-amber-500" />
                                                        TRACKING
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{t.project_id ? "Project task" : "General task"}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isTaskActive && (
                                                <div className="hidden sm:flex items-center px-2.5 py-1 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 text-xs mr-1">
                                                    <Timer
                                                        isActive={isTaskActive}
                                                        startTime={activeClockIn}
                                                        initialSeconds={initialSeconds}
                                                        estimatedHours={t.estimated_hours || undefined}
                                                    />
                                                </div>
                                            )}
                                            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${t.priority === 'high'
                                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                {t.priority}
                                            </span>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleTaskStartStop(t.id)
                                                }}
                                                className={`p-1.5 rounded-md transition-colors ${isTaskActive
                                                    ? "bg-amber-500 text-white hover:bg-amber-600"
                                                    : "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
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
                                                className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        )}
                    </div>

                    {/* HIGH PRIORITY */}
                    {highPriority.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-600" />
                                    <h3 className="font-semibold text-base text-slate-900 dark:text-white">High priority backlog</h3>
                                </div>
                            </div>
                            <div className="p-3 space-y-2">
                                {highPriority.map(t => {
                                    const isTaskActive = activeTaskId === t.id

                                    return (
                                    <div
                                        key={t.id}
                                        onClick={() => handleCardClick(t)}
                                        className={`p-3 rounded-lg flex justify-between items-center cursor-pointer transition-colors border ${isTaskActive ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40' : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 hover:border-amber-300'}`}
                                    >
                                        <div className="flex items-center gap-2 truncate mr-2">
                                            <span className="font-medium text-sm text-slate-900 dark:text-white truncate">{t.title}</span>
                                            {isTaskActive && (
                                                <span className="flex shrink-0 items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] rounded font-semibold animate-pulse">
                                                    <div className="w-1 h-1 rounded-full bg-amber-500" />
                                                    ON
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500 text-white">
                                                High
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleTaskStartStop(t.id)
                                                }}
                                                className={`p-1.5 rounded-md transition-colors ${isTaskActive
                                                    ? "bg-amber-500 text-white hover:bg-amber-600"
                                                    : "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                                }`}
                                            >
                                                {isTaskActive ? <Pause size={14} /> : <Play size={14} />}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setCompletingTask(t)
                                                    setShowCompleteModal(true)
                                                }}
                                                className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                                            >
                                                <CheckCircle size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: SCHEDULE */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-violet-600" />
                                <h3 className="font-semibold text-base text-slate-900 dark:text-white">Today&apos;s schedule</h3>
                            </div>
                        </div>

                        <div className="p-5">
                            {todaysMeetings.length === 0 ? (
                                <div className="text-center py-4">
                                    <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400">No meetings scheduled for today.</p>
                                </div>
                            ) : (
                                <div className="relative border-l-2 border-violet-200 dark:border-violet-900/40 ml-1.5 space-y-4 pl-5 py-1">
                                    {todaysMeetings.map(m => (
                                        <div key={m.id} className="relative">
                                            <div className="absolute -left-[26px] top-1 w-3 h-3 rounded-full bg-violet-500 ring-4 ring-white dark:ring-slate-900"></div>
                                            <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-3 border border-violet-100 dark:border-violet-900/40">
                                                <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 mb-0.5">
                                                    {new Date(m.date_time_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <h4 className="font-semibold text-sm text-slate-900 dark:text-white leading-tight">{m.title}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">{m.mode}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Time tracking widget */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-emerald-700" />
                                <h3 className="font-semibold text-base text-slate-900 dark:text-white">Time tracking</h3>
                            </div>
                        </div>
                        <div className="p-5">
                            {isClockedIn && activeClockIn ? (
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium uppercase tracking-wide">Currently tracking</span>
                                    </div>
                                    <div className="text-xl font-mono font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                        <Timer isActive={true} startTime={activeClockIn} />
                                        {activeTaskId && (
                                            <button
                                                onClick={() => handleTaskStartStop(activeTaskId)}
                                                className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 rounded-md p-1.5 transition-colors"
                                            >
                                                <Pause className="w-3.5 h-3.5 text-emerald-700" />
                                            </button>
                                        )}
                                    </div>
                                    {activeTaskId && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 truncate">
                                            Task: {tasks.find(t => t.id === activeTaskId)?.title || 'Unknown'}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">No active timer running.</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Start a timer from a specific task in your task list to track productivity.</p>
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
