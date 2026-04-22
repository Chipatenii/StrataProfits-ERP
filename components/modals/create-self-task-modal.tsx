"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createSelfCreatedTask } from "@/app/actions/tasks"
import { toast } from "sonner"
import { EstimatedTimeInput } from "@/components/ui/estimated-time-input"

interface CreateSelfTaskModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    taskToEdit?: {
        id: string
        title: string
        description?: string | null
        priority: "low" | "medium" | "high"
        due_date?: string | null
        estimated_hours?: number | null
        project_id?: string | null
    } | null
}

const INPUT_CLS = "mt-1 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
const SELECT_CLS = "mt-1 w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"

export function CreateSelfTaskModal({ open, onOpenChange, onSuccess, taskToEdit }: CreateSelfTaskModalProps) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        priority: "medium",
        due_date: "",
        estimated_hours: "",
        estimated_minutes: "",
        is_project_related: false,
        project_id: "",
    })
    const [isLoading, setIsLoading] = useState(false)
    const { data: projectsData } = useSWR(open ? "/api/projects" : null)
    const projects: { id: string; name: string }[] = projectsData || []

    useEffect(() => {
        if (open) {
            if (taskToEdit) {
                const eh = taskToEdit.estimated_hours
                setFormData({
                    title: taskToEdit.title || "",
                    description: taskToEdit.description || "",
                    priority: taskToEdit.priority || "medium",
                    due_date: taskToEdit.due_date ? new Date(taskToEdit.due_date).toISOString().split('T')[0] : "",
                    estimated_hours: eh != null ? String(Math.floor(eh)) : "",
                    estimated_minutes: eh != null ? String(Math.round((eh % 1) * 60)) : "",
                    is_project_related: !!taskToEdit.project_id,
                    project_id: taskToEdit.project_id || "",
                })
            } else {
                resetForm()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, taskToEdit])

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            priority: "medium",
            due_date: "",
            estimated_hours: "",
            estimated_minutes: "",
            is_project_related: false,
            project_id: "",
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title.trim()) return

        setIsLoading(true)

        try {
            const data = {
                title: formData.title,
                description: formData.description,
                priority: formData.priority as "low" | "medium" | "high",
                due_date: formData.due_date || null,
                estimated_hours: (formData.estimated_hours || formData.estimated_minutes) ? (parseFloat(formData.estimated_hours || "0") + (parseInt(formData.estimated_minutes || "0") / 60)) : null,
                is_project_related: formData.is_project_related,
                project_id: formData.is_project_related && formData.project_id ? formData.project_id : null,
            }

            const { updateSelfCreatedTask } = await import("@/app/actions/tasks")

            const result = taskToEdit
                ? await updateSelfCreatedTask(taskToEdit.id, data)
                : await createSelfCreatedTask(data)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(taskToEdit ? "Task updated" : "Task created and submitted for approval")
                resetForm()
                onSuccess()
                onOpenChange(false)
            }
        } catch (error) {
            console.error("Error creating task:", error)
            toast.error("Failed to create task")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {taskToEdit ? "Edit Task" : "Create New Task"}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        {taskToEdit ? "Update the task details below." : "Fill in the details below to create a new task."}
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
                            placeholder="What are you working on?"
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
                            placeholder="Add details about this task..."
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_project_related"
                            checked={formData.is_project_related}
                            onChange={(e) => setFormData({ ...formData, is_project_related: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-emerald-700 focus:ring-emerald-500/40"
                        />
                        <Label htmlFor="is_project_related">Link to a Project?</Label>
                    </div>

                    {formData.is_project_related && (
                        <div>
                            <Label htmlFor="project">Project</Label>
                            <select
                                id="project"
                                value={formData.project_id}
                                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                className={SELECT_CLS}
                                required={formData.is_project_related}
                            >
                                <option value="">Select a project...</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <EstimatedTimeInput
                            hours={formData.estimated_hours}
                            minutes={formData.estimated_minutes}
                            onHoursChange={(v) => setFormData({ ...formData, estimated_hours: v })}
                            onMinutesChange={(v) => setFormData({ ...formData, estimated_minutes: v })}
                        />
                    </div>

                    <div>
                        <Label htmlFor="dueDate">Due Date (Optional)</Label>
                        <Input
                            id="dueDate"
                            type="date"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            className={INPUT_CLS}
                        />
                    </div>

                    <DialogFooter className="flex flex-row justify-between items-center w-full">
                        <div>
                            {taskToEdit && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (confirm("Are you sure you want to delete this task?")) {
                                            setIsLoading(true)
                                            try {
                                                const { deleteSelfCreatedTask } = await import("@/app/actions/tasks")
                                                const result = await deleteSelfCreatedTask(taskToEdit.id)
                                                if (result.success) {
                                                    toast.success("Task deleted")
                                                    onSuccess()
                                                    onOpenChange(false)
                                                } else {
                                                    toast.error(result.error || "Failed to delete task")
                                                }
                                            } catch (e) { console.error(e) }
                                            finally { setIsLoading(false) }
                                        }
                                    }}
                                    disabled={isLoading}
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-50"
                                >
                                    Delete Task
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    resetForm()
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
                                {isLoading ? "Saving..." : taskToEdit ? "Update Task" : "Create Task"}
                            </button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
