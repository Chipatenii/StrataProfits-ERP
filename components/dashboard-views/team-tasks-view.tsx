"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import { Plus, CheckCircle, Clock, Pause, Play } from "lucide-react"
import { Task, UserProfile, TimeLog } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { CreateSelfTaskModal } from "@/components/modals/create-self-task-modal"
import { AdminCreateTaskModal } from "@/components/modals/admin-create-task-modal"
import { TaskDetailModal } from "@/components/modals/task-detail-modal"
import { TaskCompletionModal } from "@/components/modals/task-completion-modal"
import { Timer } from "@/components/timer"
import { calculateTimeSpent } from "@/lib/time-utils"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"

// Roles that a VA can assign tasks to (must match the API route)
const ASSIGNABLE_ROLES = ['team_member', 'developer', 'social_media_manager', 'book_keeper', 'marketing', 'sales', 'graphic_designer']

interface TeamTasksViewProps {
    userId: string
    userName: string
    onDataChange?: () => void
}

export function TeamTasksView({
    userId,
    onDataChange,
}: TeamTasksViewProps) {
    const supabase = createClient()
    const [taskFilter, setTaskFilter] = useState<"all" | "active" | "completed">("active")
    const [showCreateTask, setShowCreateTask] = useState(false)
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
    const [showCompleteModal, setShowCompleteModal] = useState(false)
    const [completingTask, setCompletingTask] = useState<Task | null>(null)
    const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    const handleCardClick = (task: Task) => {
        setSelectedTaskDetail(task)
        setIsDetailModalOpen(true)
    }

    const fetchTeamTasksData = async () => {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single()
        const role = profile?.role

        let tasksData: Task[] = []
        if (role === 'admin' || role === 'virtual_assistant') {
            const res = await fetch('/api/admin/tasks')
            if (res.ok) tasksData = await res.json()
        } else {
            const { data } = await supabase.from("tasks")
                .select("*")
                .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
                .order("created_at", { ascending: false })
            tasksData = data || []
        }

        const today = new Date().toISOString().split("T")[0]
        const { data: logsData } = await supabase
            .from("time_logs")
            .select("*")
            .eq("user_id", userId)
            .gte("clock_in", today)

        const { data: membersData } = await supabase.from("profiles").select("*")
        let assignableMembers: { id: string; full_name: string }[] = []
        if (role === 'virtual_assistant' && membersData) {
            assignableMembers = (membersData as UserProfile[])
                .filter(m => ASSIGNABLE_ROLES.includes(m.role as string))
                .map(m => ({ id: m.id || (m as any).user_id, full_name: m.full_name || 'Unknown' }))
        }

        return {
            role,
            tasks: tasksData,
            timeLogs: logsData || [],
            members: (membersData as UserProfile[]) || [],
            assignableMembers
        }
    }

    const { data: teamData, isLoading: loading, mutate } = useSWR(['team-tasks', userId], fetchTeamTasksData)

    const tasks = teamData?.tasks || []
    const timeLogs = teamData?.timeLogs || []
    const members = teamData?.members || []
    const assignableMembers = teamData?.assignableMembers || []
    const userRole = teamData?.role || null
    const activeTaskId = teamData?.timeLogs.find((log: any) => !log.clock_out)?.task_id || null

    const refreshData = useCallback(() => {
        mutate()
        onDataChange?.()
    }, [mutate, onDataChange])

    useRealtimeSubscription("tasks", refreshData)
    useRealtimeSubscription("time_logs", refreshData)

    const normalize = (s?: string) => s?.toLowerCase().trim() || ""

    const filteredTasks = tasks.filter((task) => {
        const status = normalize(task.status)
        if (taskFilter === "all") return true
        if (taskFilter === "active") return status !== "completed"
        if (taskFilter === "completed") return status === "completed"
        return true
    })

    const handleTaskStartStop = async (taskId: string) => {
        try {
            const activeLog = timeLogs.find((log) => !log.clock_out)

            if (activeLog?.task_id === taskId) {
                // Stop tracking
                const clockOut = new Date().toISOString()
                const clockIn = new Date(activeLog.clock_in)
                const durationMinutes = Math.round((new Date(clockOut).getTime() - clockIn.getTime()) / 60000)

                // Optimistic update
                mutate({ ...teamData, timeLogs: (teamData?.timeLogs || []).map((log: any) => log.id === activeLog.id ? { ...log, clock_out: clockOut, duration_minutes: durationMinutes } : log) } as any, false)

                await supabase.from("time_logs").update({ clock_out: clockOut, duration_minutes: durationMinutes }).eq("id", activeLog.id)
            } else {
                // Stop previous if exists
                if (activeLog) {
                    const clockOut = new Date().toISOString()
                    const clockIn = new Date(activeLog.clock_in)
                    const durationMinutes = Math.round((new Date(clockOut).getTime() - clockIn.getTime()) / 60000)
                    await supabase.from("time_logs").update({ clock_out: clockOut, duration_minutes: durationMinutes }).eq("id", activeLog.id)
                }

                // Start new
                const now = new Date().toISOString()
                mutate({ ...teamData, timeLogs: [...(teamData?.timeLogs || []), { user_id: userId, task_id: taskId, clock_in: now } as any] } as any, false)
                await supabase.from("time_logs").insert({
                    user_id: userId,
                    task_id: taskId,
                    clock_in: now,
                })
            }
            refreshData()
        } catch (e) {
            console.error("Timer toggle error:", e)
            mutate() // Revalidate on error
        }
    }

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
            refreshData()
        } catch (error) {
            const e = error as Error;
            console.error("Task completion error:", e)
            alert(e.message || "Failed to complete task.")
        }
    }

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading your tasks...</div>

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-accent">My Day Tasks</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {/* Only VAs and admins can create tasks */}
                    {(userRole === 'admin' || userRole === 'virtual_assistant') && (
                        <button
                            onClick={() => setShowCreateTask(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Task
                        </button>
                    )}
                    <div className="flex bg-white rounded-lg p-1 border border-border">
                        {(["all", "active", "completed"] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setTaskFilter(filter)}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${taskFilter === filter ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredTasks.length === 0 ? (
                    <div className="glass-card rounded-lg p-8 text-center border-dashed border-2">
                        <p className="text-muted-foreground">No {taskFilter} tasks found.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTasks.map((task) => {
                            const isTaskActive = activeTaskId === task.id
                            const isActiveTab = normalize(task.status) !== "completed"
                            const previousLogs = timeLogs.filter(l => l.task_id === task.id && l.clock_out)
                            const initialSeconds = previousLogs.reduce((acc, log) => acc + (log.duration_minutes || 0) * 60, 0)
                            const isPendingApproval = normalize(task.approval_status) === "pending"

                            return (
                                <div
                                    key={task.id}
                                    onClick={() => handleCardClick(task)}
                                    className={`glass-card rounded-xl p-4 transition-all border cursor-pointer ${isTaskActive ? 'ring-2 ring-amber-500 border-amber-200 bg-amber-50/30' : 'hover:border-blue-200'}`}
                                >
                                    <div className="flex flex-col gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-bold text-slate-900">{task.title}</h3>
                                                        {isTaskActive && (
                                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded-full font-bold animate-pulse">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                TRACKING
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-500 line-clamp-1">{task.description}</p>
                                                    {task.is_self_created && isPendingApproval && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setTaskToEdit(task)
                                                                setShowCreateTask(true)
                                                            }}
                                                            className="text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase mt-1"
                                                        >
                                                            Edit Details
                                                        </button>
                                                    )}
                                                    {/* VA can edit tasks they personally created */}
                                                    {userRole === 'virtual_assistant' && task.created_by === userId && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setTaskToEdit(task)
                                                                setShowCreateTask(true)
                                                            }}
                                                            className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold uppercase mt-1"
                                                        >
                                                            Edit Task
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex gap-2 shrink-0">
                                                    {isActiveTab && (
                                                        <>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleTaskStartStop(task.id)
                                                                }}
                                                                className={`p-2.5 rounded-full transition-all ${isTaskActive
                                                                    ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
                                                                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                                    }`}
                                                            >
                                                                {isTaskActive ? <Pause size={18} /> : <Play size={18} />}
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setCompletingTask(task)
                                                                    setShowCompleteModal(true)
                                                                }}
                                                                className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all"
                                                            >
                                                                <CheckCircle size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                                                    <Timer
                                                        isActive={isTaskActive}
                                                        startTime={isTaskActive ? timeLogs.find(l => !l.clock_out && l.task_id === task.id)?.clock_in || "" : null}
                                                        initialSeconds={initialSeconds}
                                                        estimatedHours={task.estimated_hours || undefined}
                                                    />
                                                </div>

                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${task.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                    task.priority === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                        'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                    }`}>
                                                    {task.priority}
                                                </span>

                                                {task.due_date && isActiveTab && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Clock size={12} className="text-slate-400" />
                                                        <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
                                                    </div>
                                                )}

                                                {isPendingApproval && (
                                                    <span className="text-[10px] font-bold text-amber-600 border border-amber-200 px-2 py-1 rounded bg-amber-50">
                                                        PENDING APPROVAL
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* VA uses AdminCreateTaskModal so they can assign to team members */}
            {userRole === 'virtual_assistant' ? (
                <AdminCreateTaskModal
                    open={showCreateTask}
                    members={assignableMembers}
                    userId={userId}
                    userRole={userRole}
                    taskToEdit={taskToEdit}
                    onOpenChange={(open) => {
                        setShowCreateTask(open)
                        if (!open) setTaskToEdit(null)
                    }}
                    onSuccess={() => refreshData()}
                />
            ) : (
                <CreateSelfTaskModal
                    open={showCreateTask}
                    onOpenChange={(open) => {
                        setShowCreateTask(open)
                        if (!open) setTaskToEdit(null)
                    }}
                    onSuccess={() => refreshData()}
                    taskToEdit={taskToEdit}
                />
            )}

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
            <TaskDetailModal
                open={isDetailModalOpen}
                task={selectedTaskDetail}
                members={members}
                onOpenChange={setIsDetailModalOpen}
            />
        </div>
    )
}
