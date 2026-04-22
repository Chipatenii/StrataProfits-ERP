"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Task, UserProfile } from "@/lib/types"
import { Calendar, Clock, User, Clipboard, CheckCircle2 } from "lucide-react"
import { CommentsSection } from "@/components/ui/comments-section"
import { formatDuration } from "@/lib/time-utils"

interface TaskDetailModalProps {
    open: boolean
    task: Task | null
    members: UserProfile[]
    onOpenChange: (open: boolean) => void
}

const PRIORITY_PILL: Record<string, string> = {
    high: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50",
    medium: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
    low: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
}

const STATUS_PILL: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
    in_progress: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
    pending_approval: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
}

export function TaskDetailModal({ open, task, members, onOpenChange }: TaskDetailModalProps) {
    if (!task) return null

    const assignedMember = members.find(m => m.id === task.assigned_to)

    const pill = (map: Record<string, string>, key: string) =>
        map[key?.toLowerCase()] || "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full uppercase text-[10px] font-semibold border ${pill(STATUS_PILL, task.status)}`}>
                            {task.status?.replace("_", " ")}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full uppercase text-[10px] font-semibold border ${pill(PRIORITY_PILL, task.priority)}`}>
                            {task.priority}
                        </span>
                    </div>
                    <DialogTitle className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-tight">
                        {task.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 pt-3">
                    <div className="space-y-2">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <Clipboard className="w-3.5 h-3.5" /> Description
                        </h4>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-800">
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {task.description || "No description provided."}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-2">
                            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <User className="w-3.5 h-3.5" /> Assigned To
                            </h4>
                            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase">
                                    {assignedMember?.full_name?.charAt(0) || "?"}
                                </div>
                                <span className="text-sm font-medium text-slate-900 dark:text-white">
                                    {assignedMember?.full_name || "Unassigned"}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" /> Estimate
                            </h4>
                            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-mono font-medium text-slate-900 dark:text-white">
                                    {task.estimated_hours ? formatDuration(Math.round(task.estimated_hours * 60)) : "Not estimated"}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" /> Due Date
                            </h4>
                            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-slate-900 dark:text-white">
                                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No deadline"}
                                </span>
                            </div>
                        </div>

                        {task.completed_at && (
                            <div className="space-y-2">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed At
                                </h4>
                                <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-sm font-medium">
                                        {new Date(task.completed_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {task.status === "completed" && task.completion_notes && (
                        <div className="space-y-2">
                            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Completion Notes
                            </h4>
                            <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 italic text-emerald-800 dark:text-emerald-300 text-sm">
                                &ldquo;{task.completion_notes}&rdquo;
                            </div>
                        </div>
                    )}

                    <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                        <CommentsSection entityType="task" entityId={task.id} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
