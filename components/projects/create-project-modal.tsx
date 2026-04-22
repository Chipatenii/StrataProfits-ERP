"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createProjectSchema } from "@/lib/schemas"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

type CreateProjectForm = z.infer<typeof createProjectSchema>

interface CreateProjectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

const INPUT_CLS = "rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
const SELECT_CLS = "flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"

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
            toast.error("Failed to create project")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">Create New Project</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Add a new project to organize tasks and track time.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Project Name</Label>
                        <Input id="name" {...form.register("name")} placeholder="e.g. Website Redesign" className={INPUT_CLS} />
                        {form.formState.errors.name && (
                            <p className="text-xs text-rose-600 dark:text-rose-400">{form.formState.errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <textarea
                            id="description"
                            {...form.register("description")}
                            className="flex min-h-[80px] w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            placeholder="Project goals and details..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <select id="status" {...form.register("status")} className={SELECT_CLS}>
                            <option value="active">Active</option>
                            <option value="archived">Archived</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                        >
                            {submitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
                            {submitting ? "Creating..." : "Create Project"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
