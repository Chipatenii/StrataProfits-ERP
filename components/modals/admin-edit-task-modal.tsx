"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Task, UserProfile } from "@/lib/types"
import { toast } from "sonner"

// Helper to format ISO date string to yyyy-MM-dd for HTML date inputs
function formatDateForInput(dateString: string | null | undefined): string {
    if (!dateString) return ""
    try {
        const date = new Date(dateString)
        return date.toISOString().split('T')[0]
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
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (open) {
            fetch("/api/admin/projects")
                .then(res => res.json())
                .then(data => setProjects(data || []))
                .catch(err => console.error("Failed to load projects", err))

            if (task) {
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
                estimated_hours: (formData.estimated_hours || formData.estimated_minutes) ? (parseFloat(formData.estimated_hours || "0") + (parseInt(formData.estimated_minutes || "0") / 60)) : null,
                project_id: formData.project_id || null,
            }

            const response = await fetch(`/api/admin/tasks?id=${task.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
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
            <DialogContent className="glass-card border-border/30 max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-primary">Edit Task</DialogTitle>
                    <DialogDescription>Modify task details below.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="title" className="text-foreground font-medium">
                            Task Title
                        </Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
                            className="mt-1 bg-card border-border/30"
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
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="pending_approval">Pending Approval</option>
                                <option value="completed">Completed</option>
                                <option value="verified">Verified</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="priority" className="text-foreground font-medium">
                                Priority
                            </Label>
                            <select
                                id="priority"
                                value={formData.priority}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, priority: e.target.value })}
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="project" className="text-foreground font-medium">
                                Project
                            </Label>
                            <select
                                id="project"
                                value={formData.project_id}
                                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
                            >
                                <option value="">No Project</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

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
                        <div className="col-span-2">
                            <Label className="text-foreground font-medium">
                                Estimated Time
                            </Label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Hours</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={formData.estimated_hours}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, estimated_hours: e.target.value })}
                                        className="bg-card border-border/30"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Minutes</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="59"
                                        step="5"
                                        value={formData.estimated_minutes}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, estimated_minutes: e.target.value })}
                                        className="bg-card border-border/30"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
