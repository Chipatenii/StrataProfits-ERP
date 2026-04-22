"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createDeliverableSchema } from "@/lib/schemas"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

type CreateDeliverableForm = z.infer<typeof createDeliverableSchema>

interface CreateDeliverableModalProps {
    projectId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

const INPUT_CLS = "rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
const SELECT_CLS = "flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"

export function CreateDeliverableModal({ projectId, open, onOpenChange, onSuccess }: CreateDeliverableModalProps) {
    const [submitting, setSubmitting] = useState(false)
    const [templates, setTemplates] = useState<any[]>([])

    useEffect(() => {
        if (open) {
            fetch("/api/admin/task-templates")
                .then(res => res.json())
                .then(data => setTemplates(data))
                .catch(err => console.error("Error loading templates:", err))
        }
    }, [open])

    const form = useForm<CreateDeliverableForm>({
        resolver: zodResolver(createDeliverableSchema),
        defaultValues: {
            project_id: projectId,
            name: "",
            description: "",
            status: "pending",
            due_date: null,
            phase: null,
            sort_order: 0,
            billing_type: "fixed",
            total_price: 0,
            template_id: null,
        },
    })

    const onSubmit = async (data: CreateDeliverableForm) => {
        setSubmitting(true)
        try {
            const response = await fetch("/api/admin/deliverables", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!response.ok) throw new Error("Failed to create deliverable")

            form.reset({ project_id: projectId, name: "", description: "", status: "pending", sort_order: 0, billing_type: "fixed", total_price: 0 })
            onSuccess()
            onOpenChange(false)
            toast.success("Deliverable created successfully")
        } catch (error) {
            console.error("Error creating deliverable:", error)
            toast.error("Failed to create deliverable")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">Create New Deliverable</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Add a high-level deliverable to group your project tasks.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" {...form.register("name")} placeholder="e.g. Design Phase" className={INPUT_CLS} />
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
                            placeholder="What does this deliverable cover?"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <select id="status" {...form.register("status")} className={SELECT_CLS}>
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="due_date">Due Date (Optional)</Label>
                            <Input id="due_date" type="date" {...form.register("due_date")} className={INPUT_CLS} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="template_id">Apply Task Template (Optional)</Label>
                        <select id="template_id" {...form.register("template_id")} className={SELECT_CLS}>
                            <option value="">No Template (Empty Deliverable)</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.items?.length || 0} tasks)</option>
                            ))}
                        </select>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Selecting a template will automatically populate this deliverable with predefined tasks.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/10">
                        <div className="space-y-2">
                            <Label htmlFor="billing_type">Billing Type</Label>
                            <select id="billing_type" {...form.register("billing_type")} className={SELECT_CLS}>
                                <option value="fixed">Fixed Price</option>
                                <option value="hourly">Hourly Billing</option>
                            </select>
                        </div>
                        {form.watch("billing_type") === "fixed" && (
                            <div className="space-y-2">
                                <Label htmlFor="total_price">Total Price (ZMW)</Label>
                                <Input
                                    id="total_price"
                                    type="number"
                                    step="0.01"
                                    {...form.register("total_price", { valueAsNumber: true })}
                                    className={INPUT_CLS}
                                />
                            </div>
                        )}
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
                            {submitting ? "Creating..." : "Create Deliverable"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
