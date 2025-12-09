"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Member {
    id: string
    full_name: string
}

interface AdminCreateTaskModalProps {
    open: boolean
    members: Member[]
    userId: string
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function AdminCreateTaskModal({ open, members, userId, onOpenChange, onSuccess }: AdminCreateTaskModalProps) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        status: "pending",
        priority: "medium",
        assigned_to: "",
        due_date: "",
        estimated_hours: "",
        project_id: "",
    })
    const [isLoading, setIsLoading] = useState(false)

    const [projects, setProjects] = useState<{ id: string; name: string }[]>([])

    // Fetch projects on mount
    useState(() => {
        fetch("/api/admin/projects")
            .then(res => res.json())
            .then(data => setProjects(data || []))
            .catch(err => console.error("Failed to load projects", err))
    })

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            status: "pending",
            priority: "medium",
            assigned_to: "",
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
                project_id: (formData as any).project_id || null,
                created_by: userId,
            }

            const response = await fetch("/api/admin/tasks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(taskData),
            })

            if (!response.ok) throw new Error("Failed to create task")

            resetForm()
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error("Error creating task:", error)
            alert("Failed to create task")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card border-border/30 max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-primary">Create New Task</DialogTitle>
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
                            >
                                <option value="pending">Pending</option>
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
                                value={(formData as any).project_id || ""}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, project_id: e.target.value } as any)}
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
                                resetForm()
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
                            {isLoading ? "Creating..." : "Create Task"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
