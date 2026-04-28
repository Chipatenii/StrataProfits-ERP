"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Task } from "@/lib/types"
import { TaskStatus } from "@/lib/schemas"
import { EstimatedTimeInput } from "@/components/ui/estimated-time-input"
import { MultiUserSelect } from "@/components/ui/multi-user-select"

interface Member {
    id: string
    full_name: string
    email?: string | null
    role?: string | null
}

interface AdminCreateTaskModalProps {
    open: boolean
    members: Member[]
    userId: string
    userRole?: string
    taskToEdit?: Task | null
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

const INPUT_CLS = "mt-1 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
const SELECT_CLS = "mt-1 w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-60"

export function AdminCreateTaskModal({ open, members, userId, userRole, taskToEdit, onOpenChange, onSuccess }: AdminCreateTaskModalProps) {
    const isEditMode = !!taskToEdit

    const defaultStatus = (userRole === "team_member" || userRole === "virtual_assistant") ? "pending_approval" : "pending"
    const defaultAssignedTo = userRole === "team_member" ? userId : ""

    const getInitialAssigneeIds = (): string[] => {
        if (taskToEdit) {
            const stored = (taskToEdit as Task & { assignee_ids?: string[] }).assignee_ids
            if (Array.isArray(stored) && stored.length > 0) return stored
            return taskToEdit.assigned_to ? [taskToEdit.assigned_to] : []
        }
        return defaultAssignedTo ? [defaultAssignedTo] : []
    }

    const getInitialFormData = () => {
        const eh = taskToEdit?.estimated_hours
        return {
            title: taskToEdit?.title ?? "",
            description: taskToEdit?.description ?? "",
            status: taskToEdit?.status ?? defaultStatus,
            priority: (taskToEdit?.priority ?? "medium") as "low" | "medium" | "high",
            assignee_ids: getInitialAssigneeIds(),
            due_date: taskToEdit?.due_date ? taskToEdit.due_date.split("T")[0] : "",
            estimated_hours: eh != null ? String(Math.floor(eh)) : "",
            estimated_minutes: eh != null ? String(Math.round((eh % 1) * 60)) : "",
            project_id: taskToEdit?.project_id ?? "",
        }
    }

    const [formData, setFormData] = useState(getInitialFormData)
    const [isLoading, setIsLoading] = useState(false)
    const { data: projectsData } = useSWR(open ? "/api/admin/projects" : null)
    const projects: { id: string; name: string }[] = projectsData || []

    useEffect(() => {
        if (open) {
            setFormData(getInitialFormData())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, taskToEdit])

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            status: defaultStatus,
            priority: "medium",
            assignee_ids: defaultAssignedTo ? [defaultAssignedTo] : [],
            due_date: "",
            estimated_hours: "",
            estimated_minutes: "",
            project_id: "",
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title.trim()) return

        setIsLoading(true)

        try {
            const primaryAssignee = formData.assignee_ids[0] ?? null
            const taskData: Record<string, unknown> = {
                title: formData.title,
                description: formData.description,
                status: formData.status,
                priority: formData.priority,
                assigned_to: primaryAssignee,
                assignee_ids: formData.assignee_ids,
                due_date: formData.due_date || null,
                estimated_hours: (formData.estimated_hours || formData.estimated_minutes)
                    ? (parseFloat(formData.estimated_hours || "0") + (parseInt(formData.estimated_minutes || "0") / 60))
                    : null,
                project_id: formData.project_id || null,
            }

            let response: Response

            if (isEditMode && taskToEdit) {
                response = await fetch(`/api/admin/tasks?id=${taskToEdit.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(taskData),
                })
            } else {
                taskData.created_by = userId
                response = await fetch("/api/admin/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(taskData),
                })
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || (isEditMode ? "Failed to update task" : "Failed to create task"))
            }

            if (!isEditMode) resetForm()
            onSuccess()
            onOpenChange(false)
            toast.success(isEditMode ? "Task updated successfully" : "Task created successfully")
        } catch (error: any) {
            console.error("Error saving task:", error)
            toast.error(error.message || (isEditMode ? "Failed to update task" : "Failed to create task"))
        } finally {
            setIsLoading(false)
        }
    }

    const canReassign = userRole === "admin" || userRole === "virtual_assistant"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {isEditMode ? "Edit Task" : "Create New Task"}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        {isEditMode ? "Update the task details below." : "Fill in the details to create a new task."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="title">Task Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className={INPUT_CLS}
                            placeholder="Enter task title"
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
                            placeholder="Enter task description"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                                className={SELECT_CLS}
                                disabled={userRole === "team_member" || userRole === "virtual_assistant"}
                            >
                                <option value="pending_approval">Pending Approval</option>
                                <option value="pending">Todo / Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="priority">Priority</Label>
                            <select
                                id="priority"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as "low" | "medium" | "high" })}
                                className={SELECT_CLS}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className={canReassign ? "" : "col-span-2"}>
                            <Label htmlFor="project">Project</Label>
                            <select
                                id="project"
                                value={formData.project_id || ""}
                                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                className={SELECT_CLS}
                            >
                                <option value="">No Project</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {canReassign && (
                            <div>
                                <Label htmlFor="assignedTo">Assign To</Label>
                                <MultiUserSelect
                                    users={members
                                        .filter((m) => m.role !== "admin")
                                        .map((m) => ({ id: m.id, full_name: m.full_name, email: m.email, role: m.role }))}
                                    selectedIds={formData.assignee_ids}
                                    onChange={(ids) => setFormData({ ...formData, assignee_ids: ids })}
                                    placeholder="Unassigned"
                                />
                            </div>
                        )}
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
                        <EstimatedTimeInput
                            hours={formData.estimated_hours}
                            minutes={formData.estimated_minutes}
                            onHoursChange={(v) => setFormData({ ...formData, estimated_hours: v })}
                            onMinutesChange={(v) => setFormData({ ...formData, estimated_minutes: v })}
                            className="col-span-2"
                        />
                    </div>

                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => {
                                if (!isEditMode) resetForm()
                                onOpenChange(false)
                            }}
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
                            {isLoading ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Task")}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
