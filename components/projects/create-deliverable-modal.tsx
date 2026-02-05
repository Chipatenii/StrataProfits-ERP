"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createDeliverableSchema } from "@/lib/schemas"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

type CreateDeliverableForm = z.infer<typeof createDeliverableSchema>

interface CreateDeliverableModalProps {
    projectId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

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
            <DialogContent className="sm:max-w-[500px] glass-card border-border/50">
                <DialogHeader>
                    <DialogTitle>Create New Deliverable</DialogTitle>
                    <DialogDescription>Add a high-level deliverable to group your project tasks.</DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" {...form.register("name")} placeholder="e.g. Design Phase" />
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
                            placeholder="What does this deliverable cover?"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                {...form.register("status")}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="due_date">Due Date (Optional)</Label>
                            <Input id="due_date" type="date" {...form.register("due_date")} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="template_id">Apply Task Template (Optional)</Label>
                        <select
                            id="template_id"
                            {...form.register("template_id")}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="">No Template (Empty Deliverable)</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.items?.length || 0} tasks)</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-muted-foreground">Selecting a template will automatically populate this deliverable with predefined tasks.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                        <div className="space-y-2">
                            <Label htmlFor="billing_type">Billing Type</Label>
                            <select
                                id="billing_type"
                                {...form.register("billing_type")}
                                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                            >
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
                                />
                            </div>
                        )}
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
                                "Create Deliverable"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
