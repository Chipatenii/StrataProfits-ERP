"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { addProjectMemberSchema } from "@/lib/schemas"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { UserProfile } from "@/lib/types"
import { toast } from "sonner"

type AddMemberForm = z.infer<typeof addProjectMemberSchema>

interface AddMemberModalProps {
    projectId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

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
            <DialogContent className="sm:max-w-[425px] glass-card border-border/50">
                <DialogHeader>
                    <DialogTitle>Add Project Member</DialogTitle>
                    <DialogDescription>Select a team member to add to this project.</DialogDescription>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="userId">Team Member</Label>
                        <select
                            id="userId"
                            {...form.register("userId")}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">Select a member</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.full_name} ({user.email})
                                </option>
                            ))}
                        </select>
                        {form.formState.errors.userId && (
                            <p className="text-sm text-red-500">{form.formState.errors.userId.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <select
                            id="role"
                            {...form.register("role")}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="manager">Manager</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
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
                                    Adding...
                                </>
                            ) : (
                                "Add Member"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
