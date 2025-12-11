"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
    CheckCircle,
    Clock,
    Pause,
    Play,
    Plus,
} from "lucide-react"
import { Timer } from "../timer"
import { TimerNotification } from "../timer-notification"
import { TimeAllocationIndicator } from "../time-allocation-indicator"
import { TaskCompletionModal } from "../modals/task-completion-modal"
import { calculateTimeSpent } from "@/lib/time-utils"
import { CreateSelfTaskModal } from "../modals/create-self-task-modal"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"

interface TasksViewProps {
    userId: string
    userName: string
}

export function TasksView({ userId, userName }: TasksViewProps) {
    const supabase = createClient()
    const [tasks, setTasks] = useState<any[]>([])
    const [timeLogs, setTimeLogs] = useState<any[]>([])
    const [projects, setProjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
    const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<"active" | "completed">("active")
    const [projectFilter, setProjectFilter] = useState<string>("all")
    const [showCreateTask, setShowCreateTask] = useState(false)
    const [completingTask, setCompletingTask] = useState<any | null>(null)

    const [timerNotification, setTimerNotification] = useState<{
        type: "warning" | "elapsed"
        taskTitle: string
        remainingMinutes?: number
    } | null>(null)

    // Load Data
    const loadData = useCallback(async () => {
        try {
            // Get Tasks
            const { data: tasksData } = await supabase
                .from("tasks")
                .select("*")
                .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
                .order("created_at", { ascending: false })

            setTasks(tasksData || [])

            // Get Projects (where user is a member)
            const { data: projectMembers } = await supabase
                .from("project_members")
                .select("project_id, projects(id, name)")
                .eq("user_id", userId)

            const userProjects = projectMembers?.map((pm: any) => pm.projects) || []
            // Also fetch all projects if needed/allowed, but sticking to assigned for now
            setProjects(userProjects)

            // Get Today's Logs
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const { data: logsData } = await supabase
                .from("time_logs")
                .select("*")
                .eq("user_id", userId)
                .gte("created_at", today.toISOString())

            const logs = logsData || []
            setTimeLogs(logs)

            // Find active task
            const activeLog = logs.find((log) => !log.clock_out)
            if (activeLog) {
                setActiveTaskId(activeLog.task_id)
            } else {
                setActiveTaskId(null)
            }

        } catch (error) {
            console.error("Error loading tasks view:", error)
        } finally {
            setLoading(false)
        }
    }, [userId, supabase])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Realtime
    useRealtimeSubscription({
        table: 'tasks',
        onEnsure: loadData
    })

    // Handlers
    const handleTaskStartStop = async (taskId: string) => {
        try {
            if (activeTaskId === taskId) {
                // Stop
                const activeLog = timeLogs.find(l => !l.clock_out && l.task_id === taskId)
                if (activeLog) {
                    const clockOut = new Date().toISOString()
                    const clockIn = new Date(activeLog.clock_in)
                    const duration = Math.round((new Date(clockOut).getTime() - clockIn.getTime()) / 60000)
                    await supabase.from("time_logs").update({ clock_out: clockOut, duration_minutes: duration }).eq("id", activeLog.id)
                }
                setActiveTaskId(null)
            } else {
                // Stop current if any
                if (activeTaskId) {
                    const activeLog = timeLogs.find(l => !l.clock_out && l.task_id === activeTaskId)
                    if (activeLog) {
                        const clockOut = new Date().toISOString()
                        const clockIn = new Date(activeLog.clock_in)
                        const duration = Math.round((new Date(clockOut).getTime() - clockIn.getTime()) / 60000)
                        await supabase.from("time_logs").update({ clock_out: clockOut, duration_minutes: duration }).eq("id", activeLog.id)
                    }
                }
                // Start new
                if (taskId) {
                    const { data: newLog } = await supabase.from("time_logs").insert({
                        user_id: userId,
                        task_id: taskId,
                        clock_in: new Date().toISOString()
                    }).select().single()
                    if (newLog) setActiveTaskId(taskId)
                }
            }
            loadData()
        } catch (e) {
            console.error(e)
        }
    }

    const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
        if (newStatus === 'completed') {
            const task = tasks.find(t => t.id === taskId)
            setCompletingTask(task)
        } else {
            await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId)
            loadData()
        }
    }

    const handleTimerWarning = (taskId: string, taskTitle: string, remaining: number) => {
        setTimerNotification({ type: 'warning', taskTitle, remainingMinutes: remaining })
    }

    const handleTimeElapsed = async (taskId: string, taskTitle: string) => {
        setTimerNotification({ type: 'elapsed', taskTitle })
        // Auto pause logic similar to original dashboard
        const activeLog = timeLogs.find(l => !l.clock_out && l.task_id === taskId)
        if (activeLog) {
            const clockOut = new Date().toISOString()
            const clockIn = new Date(activeLog.clock_in)
            const duration = Math.round((new Date(clockOut).getTime() - clockIn.getTime()) / 60000)
            await supabase.from("time_logs").update({ clock_out: clockOut, duration_minutes: duration }).eq("id", activeLog.id)
            setActiveTaskId(null)
        }
        await supabase.from("tasks").update({ status: 'in_progress' }).eq("id", taskId) // Check backend logic if this flags anything
        loadData()
    }

    const filteredTasks = tasks.filter(task => {
        if (activeTab === 'active') return task.status !== 'completed'
        return task.status === 'completed'
    }).filter(task => {
        if (projectFilter === 'all') return true
        return task.project_id === projectFilter
    })

    // Render
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">My Tasks</h2>
                    <button onClick={() => setShowCreateTask(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-sm font-medium">
                        <Plus className="w-4 h-4" /> New Task
                    </button>
                </div>
                <div className="flex gap-2">
                    <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">All Projects</option>
                        {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="flex bg-white rounded-lg p-1 border border-border">
                        <button onClick={() => setActiveTab('active')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'active' ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground'}`}>Active</button>
                        <button onClick={() => setActiveTab('completed')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'completed' ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground'}`}>Completed</button>
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredTasks.length === 0 ? (
                    <div className="glass-card rounded-lg p-8 text-center"><p className="text-muted-foreground">No {activeTab} tasks found</p></div>
                ) : filteredTasks.map(task => {
                    const isTaskActive = activeTaskId === task.id
                    return (
                        <div key={task.id} className="glass-card rounded-lg p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-lg font-semibold">{task.title}</h3>
                                        {task.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                                        {task.approval_status === "pending" && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium border border-amber-200"><Clock className="w-3 h-3" /> Pending Approval</span>}
                                        {task.approval_status === "rejected" && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium border border-red-200">Rejected</span>}
                                    </div>
                                    {task.description && <p className="text-muted-foreground mb-3">{task.description}</p>}
                                    {task.project_id && <div className="mb-2"><span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-medium">{projects.find(p => p.id === task.project_id)?.name || "Unknown Project"}</span></div>}
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{task.priority}</span>
                                </div>
                            </div>

                            {activeTab === 'active' && (
                                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="text-sm text-muted-foreground mb-2">Time on this task:</p>
                                                {isTaskActive ? (
                                                    <Timer isActive={true} startTime={timeLogs.find(l => !l.clock_out && l.task_id === task.id)?.clock_in || ""} estimatedHours={task.estimated_hours} onWarning={(rem) => handleTimerWarning(task.id, task.title, rem)} onTimeElapsed={() => handleTimeElapsed(task.id, task.title)} />
                                                ) : (
                                                    <p className="text-lg font-semibold">{(calculateTimeSpent(timeLogs, task.id) / 60).toFixed(1)} hrs</p>
                                                )}
                                            </div>
                                            {task.estimated_hours && <TimeAllocationIndicator spentMinutes={calculateTimeSpent(timeLogs, task.id)} estimatedHours={task.estimated_hours} size="sm" />}
                                        </div>
                                        <button onClick={() => handleTaskStartStop(task.id)} className={`px-4 py-2 rounded-lg font-medium text-white transition-all flex items-center gap-2 ${isTaskActive ? "bg-amber-500 hover:bg-amber-600" : "bg-green-600 hover:bg-green-700"}`}>
                                            {isTaskActive ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'active' ? (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleTaskStatusChange(task.id, 'completed')} className="flex-1 btn-secondary flex items-center justify-center gap-2 hover:bg-green-50 hover:text-green-600 hover:border-green-200">
                                        <CheckCircle className="w-4 h-4" /> Mark as Completed
                                    </button>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">Completed on {new Date(task.completed_at || "").toLocaleDateString()}</div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Modals */}
            {showCreateTask && <CreateSelfTaskModal open={showCreateTask} onOpenChange={setShowCreateTask} onSuccess={loadData} />}
            {completingTask && <TaskCompletionModal open={!!completingTask} onOpenChange={(o) => !o && setCompletingTask(null)} taskTitle={completingTask.title} taskId={completingTask.id} onSuccess={loadData} />}
            {timerNotification && <TimerNotification type={timerNotification.type} taskTitle={timerNotification.taskTitle} remainingMinutes={timerNotification.remainingMinutes} onClose={() => setTimerNotification(null)} />}
        </div>
    )
}
