"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, User, FileText } from "lucide-react"

interface Task {
    id: string
    title: string
    description: string
    priority: string
    status: string // Added to match AdminDashboard Task type
    due_date?: string | null
    estimated_hours?: number | null
    approval_status?: string
    created_at: string
    assigned_to: string | null
    created_by?: string
}

interface AdminReviewTaskModalProps {
    open: boolean
    task: Task | null
    onOpenChange: (open: boolean) => void
    onApprove: (task: Task) => void
    onReject: (task: Task) => void
    isProcessing: boolean
}

export function AdminReviewTaskModal({
    open,
    task,
    onOpenChange,
    onApprove,
    onReject,
    isProcessing
}: AdminReviewTaskModalProps) {
    if (!task) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card border-border/30 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl text-primary flex items-center justify-between">
                        <span>Review Task Request</span>
                        <div className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                            Pending Approval
                        </div>
                    </DialogTitle>
                    <DialogDescription>
                        Review the details below before approving or rejecting this task.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">Task Title</h3>
                            <p className="text-lg font-semibold text-foreground">{task.title}</p>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                            <div className="bg-muted/30 p-3 rounded-md border border-border/50">
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                    {task.description || "No description provided."}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Estimated Hours</p>
                                    <p className="text-sm font-medium">{task.estimated_hours ? `${task.estimated_hours} hrs` : "Not specified"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Due Date</p>
                                    <p className="text-sm font-medium">
                                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No deadline"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Priority</p>
                                    <p className="text-sm font-medium capitalize">{task.priority}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Submitted</p>
                                    <p className="text-sm font-medium">
                                        {new Date(task.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isProcessing}
                        className="w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            variant="destructive"
                            onClick={() => onReject(task)}
                            disabled={isProcessing}
                            className="flex-1 sm:flex-none bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                            Reject
                        </Button>
                        <Button
                            onClick={() => onApprove(task)}
                            disabled={isProcessing}
                            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isProcessing ? "Processing..." : "Approve Task"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
