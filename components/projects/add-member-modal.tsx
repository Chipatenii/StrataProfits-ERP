"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { addProjectMemberSchema } from "@/lib/schemas"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { UserProfile } from "@/lib/types"
import { toast } from "sonner"

type AddMemberForm = z.infer<typeof addProjectMemberSchema>

interface AddMemberModalProps {
    projectId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

const SELECT_CLS = "flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"

export function AddMemberModal({ projectId, open, onOpenChange, onSuccess }: AddMemberModalProps) {
    const [submitting, setSubmitting] = useState(false)
    const [users, setUsers] = useState<UserProfile[]>([])

    const form = useForm<AddMemberForm>({
        resolver: zodResolver(addProjectMemberSchema),
        defaultValues: {
            role: "member",
        },
    })

    useEffect(() => {
        if (open) {
            fetch("/api/admin/members")
                .then(res => res.json())
                .then(data => setUsers(data || []))
                .catch(err => console.error("Failed to load users", err))
        }
    }, [open])

    const onSubmit = async (data: AddMemberForm) => {
        setSubmitting(true)
        try {
            const response = await fetch(`/api/admin/projects/${projectId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || "Failed to add member")
            }

            form.reset()
            onSuccess()
            onOpenChange(false)
            toast.success("Member added successfully")
        } catch (error) {
            console.error("Error adding member:", error)
            toast.error(error instanceof Error ? error.message : "Failed to add member")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">Add Project Member</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Select a team member to add to this project.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="userId">Team Member</Label>
                        <select id="userId" {...form.register("userId")} className={SELECT_CLS}>
                            <option value="">Select a member</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.full_name} ({user.email})
                                </option>
                            ))}
                        </select>
                        {form.formState.errors.userId && (
                            <p className="text-xs text-rose-600 dark:text-rose-400">{form.formState.errors.userId.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <select id="role" {...form.register("role")} className={SELECT_CLS}>
                            <option value="manager">Manager</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
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
                            {submitting ? "Adding..." : "Add Member"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
