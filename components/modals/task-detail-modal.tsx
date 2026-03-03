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

export function TaskDetailModal({ open, task, members, onOpenChange }: TaskDetailModalProps) {
    if (!task) return null

    const assignedMember = members.find(m => m.id === task.assigned_to)

    const getPriorityColor = (priority: string) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'bg-red-100 text-red-700 border-red-200'
            case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200'
            case 'low': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
            default: return 'bg-slate-100 text-slate-700 border-slate-200'
        }
    }

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200'
            case 'in_progress':
            case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200'
            default: return 'bg-slate-100 text-slate-700 border-slate-200'
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] glass-card border-border/30 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold border ${getStatusColor(task.status)}`}>
                            {task.status?.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                        </span>
                    </div>
                    <DialogTitle className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                        {task.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {/* Description Section */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Clipboard className="w-4 h-4" /> Description
                        </h4>
                        <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                            <p className="text-foreground leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                                {task.description || "No description provided."}
                            </p>
                        </div>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <User className="w-4 h-4" /> Assigned To
                            </h4>
                            <div className="p-3 bg-card rounded-lg border border-border/50 shadow-sm flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs uppercase">
                                    {assignedMember?.full_name?.charAt(0) || "?"}
                                </div>
                                <span className="text-sm font-medium text-foreground">
                                    {assignedMember?.full_name || "Unassigned"}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Estimate
                            </h4>
                            <div className="p-3 bg-card rounded-lg border border-border/50 shadow-sm flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-foreground">
                                    {task.estimated_hours ? formatDuration(Math.round(task.estimated_hours * 60)) : "Not estimated"}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Due Date
                            </h4>
                            <div className="p-3 bg-card rounded-lg border border-border/50 shadow-sm flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-foreground">
                                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No deadline"}
                                </span>
                            </div>
                        </div>

                        {task.completed_at && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Completed At
                                </h4>
                                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 shadow-sm flex items-center gap-3 text-emerald-700">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-sm font-medium">
                                        {new Date(task.completed_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Completion Notes */}
                    {task.status === 'completed' && task.completion_notes && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Completion Notes
                            </h4>
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 italic text-emerald-800 text-sm">
                                "{task.completion_notes}"
                            </div>
                        </div>
                    )}
                    {/* Comments Section */}
                    <div className="pt-4 mt-6 border-t border-border">
                        <CommentsSection entityType="task" entityId={task.id} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
