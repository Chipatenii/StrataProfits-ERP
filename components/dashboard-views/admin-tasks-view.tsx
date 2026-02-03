"use client"

import { useState } from "react"
import { Plus, Edit, Trash2, ClipboardCheck, Clock, CheckCircle2, ListTodo, AlertCircle, Sparkles } from "lucide-react"
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

    const activeCount = tasks.filter(t => normalize(t.status) !== "completed").length
    const completedCount = tasks.filter(t => normalize(t.status) === "completed").length
    const pendingApprovalCount = tasks.filter(t => normalize(t.approval_status) === "pending").length

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-8 md:p-10 text-white shadow-2xl shadow-orange-500/30">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <ListTodo className="w-5 h-5 text-amber-200" />
                            <span className="text-sm font-medium text-amber-100 uppercase tracking-wider">Task Management</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">All Tasks</h1>
                        <p className="text-amber-100/80 text-lg">Manage and track all team tasks in one place</p>
                    </div>
                    <button
                        onClick={onCreateTask}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-xl hover:shadow-lg hover:bg-orange-50 active:scale-[0.98] transition-all duration-200 font-bold shadow-lg"
                    >
                        <Plus className="w-5 h-5" />
                        Create Task
                    </button>
                </div>

                {/* Quick Stats in Hero */}
                <div className="relative z-10 grid grid-cols-3 gap-4 mt-8">
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{tasks.length}</p>
                        <p className="text-sm text-amber-100/80">Total Tasks</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{activeCount}</p>
                        <p className="text-sm text-amber-100/80">Active</p>
                    </div>
                    <div className={`backdrop-blur-lg rounded-2xl p-4 border text-center ${pendingApprovalCount > 0 ? 'bg-yellow-500/30 border-yellow-400/40' : 'bg-white/15 border-white/20'}`}>
                        <p className="text-3xl font-bold">{pendingApprovalCount}</p>
                        <p className="text-sm text-amber-100/80">Pending Approval</p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 shadow-lg shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 inline-flex">
                {(["all", "active", "completed"] as const).map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setTaskFilter(filter)}
                        className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${taskFilter === filter
                            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25"
                            : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                    >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                ))}
            </div>

            {/* Tasks Grid */}
            <div className="space-y-4">
                {filteredTasks.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800">
                        <ListTodo className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No tasks found</h3>
                        <p className="text-muted-foreground">Create your first task to get started</p>
                    </div>
                ) : (
                    filteredTasks.map((task) => {
                        const isPendingApproval = normalize(task.approval_status) === "pending"
                        const isCompleted = normalize(task.status) === "completed"
                        const isInProgress = normalize(task.status) === "in_progress"

                        return (
                            <div
                                key={task.id}
                                onClick={() => handleCardClick(task)}
                                className="group bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                <h3 className="font-bold text-lg text-foreground">{task.title}</h3>
                                                {isPendingApproval && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs rounded-lg font-semibold">
                                                        <Clock className="w-3 h-3" />
                                                        Needs Approval
                                                    </span>
                                                )}
                                                <span className="text-xs font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                                    {(task.estimated_hours || 0).toFixed(1)}h Est
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-1 shrink-0">
                                            {isPendingApproval && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onReviewTask(task)
                                                    }}
                                                    className="p-2.5 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 transition-colors"
                                                    title="Review Task"
                                                >
                                                    <ClipboardCheck className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onUpdateTask(task)
                                                }}
                                                className="p-2.5 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-colors"
                                                title="Edit Task"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onDeleteTask(task.id)
                                                }}
                                                className="p-2.5 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                                                title="Delete task"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tags Row */}
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold ${isCompleted ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" :
                                                isInProgress ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" :
                                                    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                            }`}>
                                            {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                                            {task.status?.replace("_", " ")}
                                        </span>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${task.priority === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" :
                                                task.priority === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" :
                                                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                            }`}>
                                            {task.priority}
                                        </span>
                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs">
                                            👤 {getMemberName(task.assigned_to)}
                                        </span>
                                        {task.due_date && (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs">
                                                <Clock className="w-3 h-3" />
                                                {new Date(task.due_date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Completion Notes */}
                                    {isCompleted && task.completion_notes && (
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                                            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">Completion Notes:</p>
                                            <p className="text-sm text-emerald-700 dark:text-emerald-400 italic">"{task.completion_notes}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
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
