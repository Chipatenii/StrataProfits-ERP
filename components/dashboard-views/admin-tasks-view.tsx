"use client"

import { useState } from "react"
import { Plus, Edit, Trash2, ClipboardCheck, Clock } from "lucide-react"
import { Task, UserProfile } from "@/lib/types"
import { TaskDetailModal } from "@/components/modals/task-detail-modal"

interface AdminTasksViewProps {
    tasks: Task[]
    members: UserProfile[]
    onUpdateTask: (task: Task) => void
    onDeleteTask: (taskId: string) => void
    onCreateTask: () => void
    onReviewTask: (task: Task) => void
}

export function AdminTasksView({
    tasks,
    members,
    onUpdateTask,
    onDeleteTask,
    onCreateTask,
    onReviewTask,
}: AdminTasksViewProps) {
    const [taskFilter, setTaskFilter] = useState<"all" | "active" | "completed">("all")
    const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    const handleCardClick = (task: Task) => {
        setSelectedTaskDetail(task)
        setIsDetailModalOpen(true)
    }

    const normalize = (s?: string) => s?.toLowerCase().trim() || ""

    const filteredTasks = tasks.filter((task) => {
        const status = normalize(task.status)
        if (taskFilter === "all") return true
        if (taskFilter === "active") return status !== "completed"
        if (taskFilter === "completed") return status === "completed"
        return true
    })

    const getMemberName = (id?: string | null) => {
        if (!id) return "Unassigned"
        const member = members.find((m) => m.id === id || m.user_id === id)
        return member ? member.full_name : "Unknown"
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-accent">All Tasks</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                        onClick={onCreateTask}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Create Task
                    </button>
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
                    <div className="glass-card rounded-lg p-6 sm:p-8 text-center">
                        <p className="text-muted-foreground">No tasks found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTasks.map((task) => {
                            const isPendingApproval = normalize(task.approval_status) === "pending"
                            const isCompleted = normalize(task.status) === "completed"

                            return (
                                <div
                                    key={task.id}
                                    onClick={() => handleCardClick(task)}
                                    className="glass-card rounded-lg p-4 hover:shadow-md transition-all duration-200 border border-transparent hover:border-blue-100 cursor-pointer"
                                >
                                    <div className="flex flex-col gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-semibold text-foreground">{task.title}</h3>
                                                        {isPendingApproval && (
                                                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded uppercase font-bold tracking-wider shrink-0 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                Needs Approval
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-mono text-muted-foreground bg-slate-100 px-2 py-0.5 rounded">
                                                            {(task.estimated_hours || 0).toFixed(1)}h Est
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                                                </div>

                                                <div className="flex gap-1 shrink-0 items-center">
                                                    {isPendingApproval && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                onReviewTask(task)
                                                            }}
                                                            className="p-2 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors"
                                                            title="Review Task"
                                                        >
                                                            <ClipboardCheck className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onUpdateTask(task)
                                                        }}
                                                        className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                                                        title="Edit Task"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onDeleteTask(task.id)
                                                        }}
                                                        className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                                                        title="Delete task"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2 items-center">
                                                <span
                                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isCompleted
                                                        ? "bg-green-100 text-green-700 border border-green-200"
                                                        : normalize(task.status) === "in_progress"
                                                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                                                            : "bg-slate-100 text-slate-700 border border-slate-200"
                                                        }`}
                                                >
                                                    {task.status?.replace("_", " ")}
                                                </span>
                                                <span
                                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${task.priority === "high"
                                                        ? "bg-red-100 text-red-700 border border-red-200"
                                                        : task.priority === "medium"
                                                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                                                            : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                        }`}
                                                >
                                                    {task.priority}
                                                </span>
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 text-slate-600 rounded text-xs border border-slate-100">
                                                    <span className="font-medium text-[10px] uppercase text-slate-400">Assigned:</span>
                                                    {getMemberName(task.assigned_to)}
                                                </div>
                                                {task.due_date && (
                                                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-600 rounded text-xs border border-slate-100">
                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                        <span>{new Date(task.due_date).toLocaleDateString()}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {isCompleted && task.completion_notes && (
                                                <div className="mt-3 p-3 bg-green-50/50 rounded-lg border border-green-100">
                                                    <p className="text-[10px] font-bold uppercase text-green-800 mb-1">Completion Notes:</p>
                                                    <p className="text-sm text-green-700 italic">"{task.completion_notes}"</p>
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
            <TaskDetailModal
                open={isDetailModalOpen}
                task={selectedTaskDetail}
                members={members}
                onOpenChange={setIsDetailModalOpen}
            />
        </div>
    )
}
