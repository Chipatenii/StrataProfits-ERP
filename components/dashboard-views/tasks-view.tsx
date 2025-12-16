"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Edit, Trash2, CheckCircle, Clock, Pause, Play } from "lucide-react"
import { Task, UserProfile, TimeLog } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { CreateSelfTaskModal } from "@/components/modals/create-self-task-modal"
import { TaskCompletionModal } from "@/components/modals/task-completion-modal"
import { Timer } from "@/components/timer"
import { calculateTimeSpent } from "@/lib/time-utils"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"

interface TasksViewProps {
    userId: string
    userName: string
    onDataChange?: () => void
}

export function TasksView({ userId, userName, onDataChange }: TasksViewProps) {
    const supabase = createClient()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [taskFilter, setTaskFilter] = useState<"all" | "active" | "completed">("all")
    const [members, setMembers] = useState<UserProfile[]>([])

    // Feature States
    const [showCreateTask, setShowCreateTask] = useState(false)
    const [showCompleteModal, setShowCompleteModal] = useState(false)
    const [completingTask, setCompletingTask] = useState<Task | null>(null)
    const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

    // Prevent infinite loop by using a ref or checking inside
    const loadData = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true)
        try {
            // Fetch tasks
            const resTasks = await fetch(`/api/tasks?assignee_id=${userId}`)
            if (resTasks.ok) {
                const data = await resTasks.json()
                setTasks(data)
            }

            // Fetch members
            const resMembers = await fetch(`/api/admin/members`)
            if (resMembers.ok) {
                const data = await resMembers.json()
                setMembers(data)
            }

            // Fetch time logs
            const today = new Date().toISOString().split("T")[0]
            const { data: logsData } = await supabase
                .from("time_logs")
                .select("*")
                .eq("user_id", userId)
                .gte("clock_in", today)

            if (logsData) {
                // Ensure logsData matches TimeLog[]
                // @ts-ignore - Supabase type inference vs strict type mismatch
                setTimeLogs(logsData)
                const activeLog = logsData.find((log) => !log.clock_out)
                if (activeLog?.task_id) {
                    setActiveTaskId(activeLog.task_id)
                } else {
                    setActiveTaskId(null)
                }
            }

        } catch (error) {
            console.error("Failed to load data", error)
        } finally {
            if (isInitial) setLoading(false)
        }
    }, [userId, supabase])

    useEffect(() => {
        loadData(true)
    }, [loadData])

    // Wrapper to notify parent
    const refreshData = useCallback(() => {
        loadData(false)
        onDataChange?.()
    }, [loadData, onDataChange])

    // Real-time subscriptions to keep timer and tasks in sync
    useRealtimeSubscription("tasks", () => refreshData())
    useRealtimeSubscription("time_logs", () => refreshData())

    const normalize = (s?: string) => s?.toLowerCase().trim() || ""

    const filteredTasks = tasks.filter((task) => {
        const status = normalize(task.status)
        if (taskFilter === "all") return true
        if (taskFilter === "active") return status !== "completed"
        if (taskFilter === "completed") return status === "completed"
        return true
    })

    const pendingTasks = tasks.filter(t => normalize(t.approval_status) === 'pending')

    const getMemberName = (id?: string | null) => {
        if (!id) return "Unassigned"
        if (id === userId) return "You"
        const member = members.find((m) => m.user_id === id || m.id === id)
        return member ? member.full_name : "Unknown"
    }

    const handleTaskStartStop = async (taskId: string) => {
        try {
            const activeLog = timeLogs.find((log) => !log.clock_out)

            if (activeLog?.task_id === taskId) {
                // Stop tracking
                const clockOut = new Date().toISOString()
                const clockIn = new Date(activeLog.clock_in)
                const durationMinutes = Math.round((new Date(clockOut).getTime() - clockIn.getTime()) / 60000)

                // Optimistic: update in local state immediately
                setTimeLogs(prev => prev.map(log =>
                    log.id === activeLog.id ? { ...log, clock_out: clockOut, duration_minutes: durationMinutes } : log
                ))
                setActiveTaskId(null)

                await supabase.from("time_logs").update({ clock_out: clockOut, duration_minutes: durationMinutes }).eq("id", activeLog.id)
            } else {
                // Stop previous if exists
                if (activeLog) {
                    const clockOut = new Date().toISOString()
                    const clockIn = new Date(activeLog.clock_in)
                    const durationMinutes = Math.round((new Date(clockOut).getTime() - clockIn.getTime()) / 60000)

                    // Optimistic update for stopping previous
                    setTimeLogs(prev => prev.map(log =>
                        log.id === activeLog.id ? { ...log, clock_out: clockOut, duration_minutes: durationMinutes } : log
                    ))

                    await supabase.from("time_logs").update({ clock_out: clockOut, duration_minutes: durationMinutes }).eq("id", activeLog.id)
                }

                // Start new
                const now = new Date().toISOString()
                // Optimistic update for starting new
                // Only minimal fields needed for Timer to pick it up locally
                const optimisticLog: TimeLog = {
                    id: crypto.randomUUID(), // Temp ID
                    user_id: userId,
                    task_id: taskId,
                    clock_in: now,
                    clock_out: null,
                    duration_minutes: null
                }
                setTimeLogs(prev => [...prev, optimisticLog])
                setActiveTaskId(taskId)

                await supabase.from("time_logs").insert({
                    user_id: userId,
                    task_id: taskId,
                    clock_in: now,
                })
            }
            // Re-sync
            refreshData()
        } catch (e) {
            console.error(e)
            // Revert on error would be ideal but complex to implement here without deep state management
            // For now, loadData() to resync
            loadData(false)
        }
    }

    const handleInitiateCompletion = (task: Task) => {
        setCompletingTask(task)
        setShowCompleteModal(true)
    }

    const handleTaskComplete = async (notes: string) => {
        if (!completingTask) return

        try {
            if (activeTaskId === completingTask.id) {
                await handleTaskStartStop(completingTask.id)
            }

            // Use API to bypass RLS
            const response = await fetch("/api/tasks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: completingTask.id,
                    status: "completed",
                    completion_notes: notes,
                    completed_at: new Date().toISOString()
                })
            })

            if (!response.ok) {
                const text = await response.text()
                let errorMsg = "Failed to complete task"
                try {
                    const errorData = JSON.parse(text)
                    errorMsg = errorData.error || errorMsg
                } catch {
                    // ignore json parse error
                }
                throw new Error(errorMsg)
            }

            setShowCompleteModal(false)
            setCompletingTask(null)
            refreshData()
        } catch (e) {
            console.error("Error completing task", e)
            alert("Failed to complete task. Please try again.")
        }
    }


    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("Are you sure?")) return
        try {
            await fetch(`/api/admin/tasks?id=${taskId}`, { method: 'DELETE' })
            refreshData()
        } catch (e) { console.error(e) }
    }

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading tasks...</div>

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-bold">My Tasks</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setShowCreateTask(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Create Task
                    </button>
                    <div className="flex bg-white rounded-lg p-1 border border-border">
                        <button
                            onClick={() => setTaskFilter("all")}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${taskFilter === "all" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setTaskFilter("active")}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${taskFilter === "active" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setTaskFilter("completed")}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${taskFilter === "completed" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            Completed
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredTasks.length === 0 ? (
                    <div className="glass-card rounded-lg p-6 sm:p-8 text-center">
                        <p className="text-muted-foreground">No tasks found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTasks.map((task) => {
                            // Only hide if we are in "completed" tab and task is not completed, etc. Logic handled by filteredTasks.
                            // We DO want to show pending approval tasks here now.

                            const isTaskActive = activeTaskId === task.id
                            const isActiveTab = normalize(task.status) !== "completed" // Simplification for UI buttons
                            // Calculate total previously spent time (excluding current active session if any)
                            const previousLogs = timeLogs.filter(l => l.task_id === task.id && l.clock_out)
                            const initialSeconds = previousLogs.reduce((acc, log) => acc + (log.duration_minutes || 0) * 60, 0)
                            const isPendingApproval = normalize(task.approval_status) === "pending"

                            return (
                                <div key={task.id} className="glass-card rounded-lg p-4 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-semibold text-foreground truncate">{task.title}</h3>
                                                    {isPendingApproval && (
                                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded uppercase font-bold tracking-wider shrink-0">
                                                            Needs Approval
                                                        </span>
                                                    )}
                                                    <div className={`flex items-center gap-2 px-2 py-1 rounded-full border ${isTaskActive ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
                                                        {isTaskActive && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                                                        {/* Only show timer for non-completed tasks */}
                                                        {normalize(task.status) !== "completed" ? (
                                                            <Timer
                                                                isActive={isTaskActive}
                                                                startTime={isTaskActive ? timeLogs.find(l => !l.clock_out && l.task_id === task.id)?.clock_in || "" : null}
                                                                initialSeconds={initialSeconds}
                                                                estimatedHours={task.estimated_hours || undefined}
                                                            />
                                                        ) : (
                                                            <div className="text-sm font-mono text-muted-foreground ml-1">
                                                                {(initialSeconds / 3600).toFixed(1)}h
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 shrink-0 items-center">
                                                    {isActiveTab && (
                                                        <>
                                                            <button
                                                                onClick={() => handleTaskStartStop(task.id)}
                                                                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${isTaskActive
                                                                    ? "bg-amber-100 text-amber-600 hover:bg-amber-200 ring-2 ring-amber-500 ring-offset-1"
                                                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                                    }`}
                                                                title={isTaskActive ? "Pause Timer" : "Start Timer"}
                                                            >
                                                                {isTaskActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleInitiateCompletion(task)}
                                                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                                                                title="Mark as Completed"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}

                                                    <button
                                                        onClick={() => handleDeleteTask(task.id)}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                                                        title="Delete task"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>

                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-medium ${normalize(task.status) === "completed"
                                                        ? "bg-green-100 text-green-700"
                                                        : normalize(task.status) === "in_progress"
                                                            ? "bg-blue-100 text-blue-700"
                                                            : "bg-gray-100 text-gray-700"
                                                        }`}
                                                >
                                                    {task.status}
                                                </span>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${task.priority === "high"
                                                    ? "bg-red-100 text-red-700"
                                                    : task.priority === "medium"
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-green-100 text-green-700"
                                                    }`}
                                                >
                                                    {task.priority}
                                                </span>
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                                    {getMemberName(task.assigned_to)}
                                                </span>
                                                {task.due_date && (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(task.due_date).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {task.estimated_hours && (
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                                        Est: {task.estimated_hours}h
                                                    </span>
                                                )}
                                            </div>

                                            {/* Completion Notes */}
                                            {normalize(task.status) === "completed" && task.completion_notes && (
                                                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                                                    <p className="text-xs font-semibold text-green-800 mb-1">Completion Notes:</p>
                                                    <p className="text-sm text-green-700">{task.completion_notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <CreateSelfTaskModal
                open={showCreateTask}
                onOpenChange={setShowCreateTask}
                onSuccess={() => refreshData()}
            />

            {completingTask && (
                <TaskCompletionModal
                    isOpen={showCompleteModal}
                    onClose={() => {
                        setShowCompleteModal(false)
                        setCompletingTask(null)
                    }}
                    onComplete={handleTaskComplete}
                    taskTitle={completingTask.title}
                    spentMinutes={calculateTimeSpent(timeLogs as any[], completingTask.id)}
                    estimatedHours={completingTask.estimated_hours || undefined}
                />
            )}
        </div>
    )
}
