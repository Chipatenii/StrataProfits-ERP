"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createSelfCreatedTask } from "@/app/actions/tasks"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface CreateSelfTaskModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function CreateSelfTaskModal({ open, onOpenChange, onSuccess }: CreateSelfTaskModalProps) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        priority: "medium",
        due_date: "",
        estimated_hours: "",
        is_project_related: false,
        project_id: "",
    })
    const [isLoading, setIsLoading] = useState(false)
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([])

    // Load projects on open so user can select if they toggle project related
    useEffect(() => {
        if (open) {
            const loadProjects = async () => {
                const supabase = createClient()
                const { data } = await supabase.from("projects").select("id, name").eq("status", "active")
                if (data) setProjects(data)
            }
            loadProjects()
        }
    }, [open])

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            priority: "medium",
            due_date: "",
            estimated_hours: "",
            is_project_related: false,
            project_id: "",
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title.trim()) return

        setIsLoading(true)

        try {
            const result = await createSelfCreatedTask({
                title: formData.title,
                description: formData.description,
                priority: formData.priority as "low" | "medium" | "high",
                due_date: formData.due_date || null,
                estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
                is_project_related: formData.is_project_related,
                project_id: formData.is_project_related && formData.project_id ? formData.project_id : null,
            })

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Task created and submitted for approval")
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
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="mt-1 bg-card border-border/30"
                            placeholder="What are you working on?"
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
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground placeholder-muted-foreground"
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
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="is_project_related" className="text-foreground font-medium">Link to a Project?</Label>
                    </div>

                    {formData.is_project_related && (
                        <div>
                            <Label htmlFor="project" className="text-foreground font-medium">
                                Project
                            </Label>
                            <select
                                id="project"
                                value={formData.project_id}
                                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
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
                            <Label htmlFor="priority" className="text-foreground font-medium">
                                Priority
                            </Label>
                            <select
                                id="priority"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="estimatedHours" className="text-foreground font-medium">
                                Est. Hours
                            </Label>
                            <Input
                                id="estimatedHours"
                                type="number"
                                step="0.5"
                                min="0"
                                value={formData.estimated_hours}
                                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                                className="mt-1 bg-card border-border/30"
                                placeholder="e.g. 2.5"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="dueDate" className="text-foreground font-medium">
                            Due Date (Optional)
                        </Label>
                        <Input
                            id="dueDate"
                            type="date"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            className="mt-1 bg-card border-border/30"
                        />
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
