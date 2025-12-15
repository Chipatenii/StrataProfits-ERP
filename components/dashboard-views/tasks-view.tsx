"use client"

import { useState } from "react"
import { Plus, Edit, Trash2, CheckCircle, Clock } from "lucide-react"
import { Task, UserProfile } from "@/lib/types"

interface TasksViewProps {
    tasks: Task[]
    members: UserProfile[]
    onUpdateTask: (task: Task) => void
    onDeleteTask: (taskId: string) => void
    onCreateTask: () => void
}

export function TasksView({ tasks, members, onUpdateTask, onDeleteTask, onCreateTask }: TasksViewProps) {
    const [taskFilter, setTaskFilter] = useState<"all" | "active" | "completed">("all")
    const [reviewingTask, setReviewingTask] = useState<Task | null>(null) // Local state for review if needed, or bubble up

    const filteredTasks = tasks.filter((task) => {
        if (taskFilter === "all") return true
        if (taskFilter === "active") return task.status !== "completed"
        if (taskFilter === "completed") return task.status === "completed"
        return true
    })

    const pendingTasks = tasks.filter(t => t.approval_status === 'pending')

    const getMemberName = (id?: string | null) => {
        if (!id) return "Unassigned"
        const member = members.find((m) => m.user_id === id || m.id === id)
        return member ? member.full_name : "Unknown"
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-bold">All Tasks</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                        onClick={onCreateTask}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors font-medium text-sm sm:text-base"
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
                {/* Task Requests Section */}
                {(taskFilter === 'all' || taskFilter === 'active') && pendingTasks.length > 0 && (
                    <div className="space-y-3 mb-6">
                        <h3 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
                            <span className="w-2 h-8 bg-amber-500 rounded-full"></span>
                            Pending Reviews ({pendingTasks.length})
                        </h3>
                        <div className="grid gap-3">
                            {pendingTasks.map((task) => (
                                <div key={task.id} className="glass-card rounded-lg p-4 border-l-4 border-l-amber-500 bg-amber-50/40">
                                    <div className="flex flex-col gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-foreground">{task.title}</h3>
                                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded uppercase font-bold tracking-wider">
                                                    Needs Approval
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                                                <span>Requested by: <span className="font-medium text-foreground">{getMemberName(task.assigned_to)}</span></span>
                                                <span>{new Date(task.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onUpdateTask(task)} // Using onUpdateTask to trigger edit/review modal logic in parent if needed, or we might need a specific onReview prop
                                            className="w-full sm:w-auto px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm"
                                        >
                                            Review Request
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="h-px bg-border/50 my-4" />
                    </div>
                )}

                {filteredTasks.filter(t => t.approval_status !== "pending").length === 0 ? (
                    <div className="glass-card rounded-lg p-6 sm:p-8 text-center">
                        <p className="text-muted-foreground">No tasks found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTasks.map((task) => (
                            <div key={task.id} className="glass-card rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex flex-col gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-semibold text-foreground truncate">{task.title}</h3>
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    onClick={() => onUpdateTask(task)}
                                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                                    title="Edit task"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteTask(task.id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                                                    title="Delete task"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {task.approval_status === "pending" && (
                                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded uppercase font-bold tracking-wider">
                                                Request
                                            </span>
                                        )}
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${task.status === "completed"
                                                    ? "bg-green-100 text-green-700"
                                                    : task.status === "in_progress"
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
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
