"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Task } from "@/lib/types"

interface Member {
    id: string
    full_name: string
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

export function AdminCreateTaskModal({ open, members, userId, userRole, taskToEdit, onOpenChange, onSuccess }: AdminCreateTaskModalProps) {
    const isEditMode = !!taskToEdit

    // Default status for team_member and va is pending_approval
    const defaultStatus = (userRole === "team_member" || userRole === "virtual_assistant") ? "pending_approval" : "pending"
    // Default assignee for team member is themselves
    const defaultAssignedTo = userRole === "team_member" ? userId : ""

    const getInitialFormData = () => ({
        title: taskToEdit?.title ?? "",
        description: taskToEdit?.description ?? "",
        status: taskToEdit?.status ?? defaultStatus,
        priority: (taskToEdit?.priority ?? "medium") as "low" | "medium" | "high",
        assigned_to: taskToEdit?.assigned_to ?? defaultAssignedTo,
        due_date: taskToEdit?.due_date ? taskToEdit.due_date.split("T")[0] : "",
        estimated_hours: taskToEdit?.estimated_hours != null ? String(taskToEdit.estimated_hours) : "",
        project_id: taskToEdit?.project_id ?? "",
    })

    const [formData, setFormData] = useState(getInitialFormData)
    const [isLoading, setIsLoading] = useState(false)
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([])

    // Fetch projects when modal opens; re-populate form if editing
    useEffect(() => {
        if (open) {
            fetch("/api/admin/projects")
                .then(res => res.json())
                .then(data => setProjects(data || []))
                .catch(err => console.error("Failed to load projects", err))

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
            assigned_to: defaultAssignedTo,
            due_date: "",
            estimated_hours: "",
            project_id: "",
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title.trim()) return

        setIsLoading(true)

        try {
            const taskData: any = {
                title: formData.title,
                description: formData.description,
                status: formData.status,
                priority: formData.priority,
                assigned_to: formData.assigned_to || null,
                due_date: formData.due_date || null,
                estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
                project_id: formData.project_id || null,
            }

            let response: Response

            if (isEditMode && taskToEdit) {
                // PATCH to update existing task
                response = await fetch(`/api/admin/tasks?id=${taskToEdit.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(taskData),
                })
            } else {
                // POST to create new task
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
            <DialogContent className="glass-card border-border/30 max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-primary">
                        {isEditMode ? "Edit Task" : "Create New Task"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditMode ? "Update the task details below." : "Fill in the details to create a new task."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="title" className="text-foreground font-medium">
                            Task Title *
                        </Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
                            className="mt-1 bg-card border-border/30"
                            placeholder="Enter task title"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="description" className="text-foreground font-medium">
                            Description
                        </Label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                            className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground placeholder-muted-foreground"
                            placeholder="Enter task description"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="status" className="text-foreground font-medium">
                                Status
                            </Label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: e.target.value })}
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
                                disabled={userRole === "team_member" || userRole === "virtual_assistant"}
                            >
                                <option value="pending_approval">Pending Approval</option>
                                <option value="pending">Todo / Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="priority" className="text-foreground font-medium">
                                Priority
                            </Label>
                            <select
                                id="priority"
                                value={formData.priority}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, priority: e.target.value as "low" | "medium" | "high" })}
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className={canReassign ? "" : "col-span-2"}>
                            <Label htmlFor="project" className="text-foreground font-medium">
                                Project
                            </Label>
                            <select
                                id="project"
                                value={formData.project_id || ""}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, project_id: e.target.value })}
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
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
                                <Label htmlFor="assignedTo" className="text-foreground font-medium">
                                    Assign To
                                </Label>
                                <select
                                    id="assignedTo"
                                    value={formData.assigned_to}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, assigned_to: e.target.value })}
                                    className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
                                >
                                    <option value="">Unassigned</option>
                                    {members.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.full_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="dueDate" className="text-foreground font-medium">
                                Due Date (Deadline)
                            </Label>
                            <Input
                                id="dueDate"
                                type="date"
                                value={formData.due_date}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, due_date: e.target.value })}
                                className="mt-1 bg-card border-border/30"
                            />
                        </div>
                        <div>
                            <Label htmlFor="estimatedHours" className="text-foreground font-medium">
                                Estimated Hours
                            </Label>
                            <Input
                                id="estimatedHours"
                                type="number"
                                step="0.5"
                                min="0"
                                value={formData.estimated_hours}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, estimated_hours: e.target.value })}
                                className="mt-1 bg-card border-border/30"
                                placeholder="e.g. 5.5"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (!isEditMode) resetForm()
                                onOpenChange(false)
                            }}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {isLoading ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save Changes" : "Create Task")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
