"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createProjectSchema } from "@/lib/schemas"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

type CreateProjectForm = z.infer<typeof createProjectSchema>

interface CreateProjectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function CreateProjectModal({ open, onOpenChange, onSuccess }: CreateProjectModalProps) {
    const [submitting, setSubmitting] = useState(false)

    const form = useForm<CreateProjectForm>({
        resolver: zodResolver(createProjectSchema),
        defaultValues: {
            name: "",
            description: "",
            status: "active",
        },
    })

    const onSubmit = async (data: CreateProjectForm) => {
        setSubmitting(true)
        try {
            const response = await fetch("/api/admin/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!response.ok) throw new Error("Failed to create project")

            form.reset()
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error("Error creating project:", error)
            // Ideally show toast error here
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>Add a new project to organize tasks and track time.</DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Project Name</Label>
                        <Input id="name" {...form.register("name")} placeholder="e.g. Website Redesign" />
                        {form.formState.errors.name && (
                            <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <textarea
                            id="description"
                            {...form.register("description")}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Project goals and details..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <select
                            id="status"
                            {...form.register("status")}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Project"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
