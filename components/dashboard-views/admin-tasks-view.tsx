"use client"

import { useState } from "react"
import { Plus, Edit, Trash2, ClipboardCheck, Clock, CheckCircle2, ListTodo, Search } from "lucide-react"
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
    const [taskFilter, setTaskFilter] = useState<"all" | "active" | "completed" | "review">("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    const handleCardClick = (task: Task) => {
        setSelectedTaskDetail(task)
        setIsDetailModalOpen(true)
    }

    const normalize = (s?: string) => s?.toLowerCase().trim() || ""

    const filteredTasks = tasks.filter((task) => {
        const status = normalize(task.status)
        const approvalStatus = normalize(task.approval_status)
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            if (!task.title?.toLowerCase().includes(q) && !task.description?.toLowerCase().includes(q)) return false
        }
        if (taskFilter === "all") return true
        if (taskFilter === "active") return status !== "completed" && status !== "verified" && status !== "pending_approval"
        if (taskFilter === "completed") return status === "completed" || status === "verified"
        if (taskFilter === "review") return (status === "pending_approval" || approvalStatus === "pending") && status !== "verified"
        return true
    })

    const getMemberName = (id?: string | null) => {
        if (!id) return "Unassigned"
        const member = members.find((m) => m.id === id || m.user_id === id)
        return member ? member.full_name : "Unknown"
    }

    const activeCount = tasks.filter(t => {
        const s = normalize(t.status)
        return s !== "completed" && s !== "verified" && s !== "pending_approval"
    }).length
    const reviewCount = tasks.filter(t => normalize(t.status) === "pending_approval" || normalize(t.status) === "completed" || normalize(t.approval_status) === "pending").length

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header (QuickBooks-style, flat) */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Tasks</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and track all team tasks in one place.</p>
                </div>
                <button
                    onClick={onCreateTask}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors font-semibold text-sm shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Create task
                </button>
            </div>

            {/* Headline KPI strip */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
                <KpiCard label="Total tasks" value={tasks.length.toString()} tone="slate" />
                <KpiCard label="Active" value={activeCount.toString()} tone="slate" />
                <KpiCard label="Requires review" value={reviewCount.toString()} tone={reviewCount > 0 ? "amber" : "slate"} />
            </div>

            {/* Search + Filter row */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tasks by title or description"
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-colors"
                    />
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800 flex flex-wrap gap-1">
                    {(["all", "review", "active", "completed"] as const).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setTaskFilter(filter)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${taskFilter === filter
                                ? "bg-emerald-700 text-white"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white"
                                }`}
                        >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            {filter === "review" && reviewCount > 0 && (
                                <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] rounded-full px-1 ${taskFilter === filter ? "bg-white/25" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                                    {reviewCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tasks list */}
            <div className="space-y-3">
                {filteredTasks.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800">
                        <ListTodo className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No tasks found</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Adjust your filters or create a new task to get started.</p>
                    </div>
                ) : (
                    filteredTasks.map((task) => {
                        const isPendingApproval = normalize(task.status) === "pending_approval" || normalize(task.approval_status) === "pending"
                        const isCompletedNeedsReview = normalize(task.status) === "completed"
                        const isFullyDone = normalize(task.status) === "verified"
                        const isInProgress = normalize(task.status) === "in_progress"

                        return (
                            <div
                                key={task.id}
                                onClick={() => handleCardClick(task)}
                                className="group bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
                            >
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                                <h3 className="font-semibold text-[15px] text-slate-900 dark:text-white">{task.title}</h3>
                                                {isPendingApproval && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px] rounded-md font-medium">
                                                        <Clock className="w-3 h-3" />
                                                        Needs approval
                                                    </span>
                                                )}
                                                {isCompletedNeedsReview && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[11px] rounded-md font-medium">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Needs verification
                                                    </span>
                                                )}
                                                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                                    {(task.estimated_hours || 0).toFixed(1)}h est
                                                </span>
                                            </div>
                                            {task.description && (
                                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{task.description}</p>
                                            )}
                                        </div>

                                        <div className="flex gap-0.5 shrink-0">
                                            {(isPendingApproval || isCompletedNeedsReview) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onReviewTask(task)
                                                    }}
                                                    className={`p-2 rounded-md transition-colors ${isCompletedNeedsReview ? 'hover:bg-violet-50 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}
                                                    title={isCompletedNeedsReview ? "Verify task" : "Approve task"}
                                                >
                                                    <ClipboardCheck className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onUpdateTask(task)
                                                }}
                                                className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                                                title="Edit task"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onDeleteTask(task.id)
                                                }}
                                                className="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                                                title="Delete task"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 items-center">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${isFullyDone ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
                                                isCompletedNeedsReview ? "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" :
                                                isInProgress ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" :
                                                    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                            }`}>
                                            {isFullyDone && <CheckCircle2 className="w-3 h-3" />}
                                            {task.status?.replace("_", " ")}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${task.priority === "high" ? "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300" :
                                                task.priority === "medium" ? "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                                                    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                            }`}>
                                            {task.priority}
                                        </span>
                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-[11px]">
                                            {getMemberName(task.assigned_to)}
                                        </span>
                                        {task.due_date && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-[11px]">
                                                <Clock className="w-3 h-3" />
                                                {new Date(task.due_date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>

                                    {(isFullyDone || isCompletedNeedsReview) && task.completion_notes && (
                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                                            <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mb-0.5 uppercase tracking-wide">Completion notes</p>
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

function KpiCard({ label, value, tone }: { label: string; value: string; tone: "slate" | "amber" }) {
    const valueClass = tone === "amber" ? "text-amber-700 dark:text-amber-300" : "text-slate-900 dark:text-white"
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl md:text-[26px] font-bold leading-tight mt-1 ${valueClass}`}>{value}</p>
        </div>
    )
}
