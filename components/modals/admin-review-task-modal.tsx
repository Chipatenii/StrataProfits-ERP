"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Calendar, Clock, User } from "lucide-react"
import { Task } from "@/lib/types"
import { formatDuration } from "@/lib/time-utils"

interface AdminReviewTaskModalProps {
    open: boolean
    task: Task | null
    onOpenChange: (open: boolean) => void
    onApprove: (task: Task) => void
    onReject: (task: Task) => void
    onVerify?: (task: Task) => void
    onRejectCompletion?: (task: Task) => void
    isProcessing: boolean
}

export function AdminReviewTaskModal({
    open,
    task,
    onOpenChange,
    onApprove,
    onReject,
    onVerify,
    onRejectCompletion,
    isProcessing
}: AdminReviewTaskModalProps) {
    if (!task) return null

    const isCompleted = task.status === "completed"
    const canVerify = isCompleted && onVerify

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-between gap-3">
                        <span>{canVerify ? "Verify Task" : "Review Task Request"}</span>
                        <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                                canVerify
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
                                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50"
                            }`}
                        >
                            {canVerify ? "Needs Verification" : "Pending Approval"}
                        </span>
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Review the details below before {canVerify ? "verifying" : "approving or rejecting"} this task.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    <div>
                        <h3 className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 mb-1">Task Title</h3>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">{task.title}</p>
                    </div>

                    <div>
                        <h3 className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 mb-1">Description</h3>
                        <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                {task.description || "No description provided."}
                            </p>
                        </div>
                    </div>

                    {task.completion_notes && (
                        <div>
                            <h3 className="text-[11px] uppercase tracking-wide font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Completion Notes</h3>
                            <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                                <p className="text-sm text-emerald-800 dark:text-emerald-300 italic whitespace-pre-wrap">
                                    &ldquo;{task.completion_notes}&rdquo;
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Estimated Hours</p>
                                <p className="text-sm font-mono font-medium text-slate-900 dark:text-white">
                                    {task.estimated_hours ? formatDuration(Math.round(task.estimated_hours * 60)) : "—"}
                                </p>
                            </div>
                        </div>

                        {task.time_allocated && (
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-emerald-700" />
                                <div>
                                    <p className="text-[11px] text-emerald-700 font-medium">Time Allocated</p>
                                    <p className="text-sm font-mono font-bold text-emerald-700">{formatDuration(Math.round(task.time_allocated * 60))}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Due Date</p>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No deadline"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Priority</p>
                                <p className="text-sm font-medium capitalize text-slate-900 dark:text-white">{task.priority}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={isProcessing}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        {!canVerify && (
                            <button
                                type="button"
                                onClick={() => onReject(task)}
                                disabled={isProcessing}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg border border-rose-200 bg-white dark:bg-slate-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-50"
                            >
                                Reject
                            </button>
                        )}
                        {canVerify && onRejectCompletion && (
                            <button
                                type="button"
                                onClick={() => onRejectCompletion(task)}
                                disabled={isProcessing}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg border border-rose-200 bg-white dark:bg-slate-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-50"
                            >
                                Return for Rework
                            </button>
                        )}
                        {canVerify ? (
                            <button
                                type="button"
                                onClick={() => onVerify(task)}
                                disabled={isProcessing}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                            >
                                {isProcessing ? "Processing..." : "Verify Task"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onApprove(task)}
                                disabled={isProcessing}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                            >
                                {isProcessing ? "Processing..." : "Approve Task"}
                            </button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
