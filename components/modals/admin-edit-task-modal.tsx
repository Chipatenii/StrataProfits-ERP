"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Task, UserProfile } from "@/lib/types"
import { toast } from "sonner"

function formatDateForInput(dateString: string | null | undefined): string {
    if (!dateString) return ""
    try {
        const date = new Date(dateString)
        return date.toISOString().split("T")[0]
    } catch {
        return ""
    }
}

interface AdminEditTaskModalProps {
    open: boolean
    task: Task | null
    members: UserProfile[]
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

const INPUT_CLS = "mt-1 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
const SELECT_CLS = "mt-1 w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"

export function AdminEditTaskModal({ open, task, members, onOpenChange, onSuccess }: AdminEditTaskModalProps) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        status: "pending",
        priority: "medium",
        assigned_to: "",
        due_date: "",
        estimated_hours: "",
        estimated_minutes: "",
        project_id: "",
    })
    const { data: projectsData } = useSWR(open ? "/api/admin/projects" : null)
    const projects: { id: string; name: string }[] = projectsData || []
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (open && task) {
            const eh = task.estimated_hours
            setFormData({
                title: task.title,
                description: task.description || "",
                status: task.status,
                priority: task.priority,
                assigned_to: task.assigned_to || "",
                due_date: formatDateForInput(task.due_date),
                estimated_hours: eh != null ? String(Math.floor(eh)) : "",
                estimated_minutes: eh != null ? String(Math.round((eh % 1) * 60)) : "",
                project_id: task.project_id || "",
            })
        }
    }, [task, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!task || !formData.title.trim()) return

        setIsLoading(true)

        try {
            const updateData: any = {
                title: formData.title,
                description: formData.description,
                status: formData.status,
                priority: formData.priority,
                assigned_to: formData.assigned_to || null,
                due_date: formData.due_date || null,
                estimated_hours: (formData.estimated_hours || formData.estimated_minutes)
                    ? (parseFloat(formData.estimated_hours || "0") + (parseInt(formData.estimated_minutes || "0") / 60))
                    : null,
                project_id: formData.project_id || null,
            }

            const response = await fetch(`/api/admin/tasks?id=${task.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData),
            })

            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}))
                throw new Error(errJson.error || "Failed to update task")
            }

            onSuccess()
            onOpenChange(false)
            toast.success("Task updated successfully")
        } catch (error) {
            console.error("Error updating task:", error)
            toast.error(error instanceof Error ? error.message : "Failed to update task")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">Edit Task</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">Modify task details below.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="title">Task Title</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className={INPUT_CLS}
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="description">Description</Label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className={SELECT_CLS}
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="pending_approval">Pending Approval</option>
                                <option value="completed">Completed</option>
                                <option value="verified">Verified</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="priority">Priority</Label>
                            <select
                                id="priority"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className={SELECT_CLS}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="project">Project</Label>
                            <select
                                id="project"
                                value={formData.project_id}
                                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                className={SELECT_CLS}
                            >
                                <option value="">No Project</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="assignedTo">Assign To</Label>
                            <select
                                id="assignedTo"
                                value={formData.assigned_to}
                                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                                className={SELECT_CLS}
                            >
                                <option value="">Unassigned</option>
                                {members.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="dueDate">Due Date (Deadline)</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                className={INPUT_CLS}
                            />
                        </div>
                        <div className="col-span-2">
                            <Label>Estimated Time</Label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                <div>
                                    <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Hours</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={formData.estimated_hours}
                                        onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                                        className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Minutes</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="59"
                                        step="5"
                                        value={formData.estimated_minutes}
                                        onChange={(e) => setFormData({ ...formData, estimated_minutes: e.target.value })}
                                        className="rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                        >
                            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
                            {isLoading ? "Saving..." : "Save Changes"}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
