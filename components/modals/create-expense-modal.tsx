"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface CreateExpenseModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    initialData?: any
}

export function CreateExpenseModal({ open, onOpenChange, onSuccess, initialData }: CreateExpenseModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        amount: "",
        category: "Other",
        description: "",
        currency: "ZMW",
        date: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({
                    amount: initialData.amount?.toString() || "",
                    category: initialData.category || "Other",
                    description: initialData.description || "",
                    currency: initialData.currency || "ZMW",
                    date: initialData.date || new Date().toISOString().split('T')[0]
                })
            } else {
                setFormData({
                    amount: "",
                    category: "Other",
                    description: "",
                    currency: "ZMW",
                    date: new Date().toISOString().split('T')[0]
                })
            }
        }
    }, [open, initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount)
            }

            const url = initialData?.id ? `/api/expenses?id=${initialData.id}` : "/api/expenses"
            const method = initialData?.id ? "PATCH" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error(`Failed to ${initialData ? 'update' : 'create'} expense`)

            onSuccess()
            onOpenChange(false)
            toast.success(initialData ? 'Expense updated successfully' : 'Expense recorded successfully')
        } catch (error) {
            console.error(error)
            toast.error(`Failed to ${initialData ? 'update' : 'create'} expense`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md glass-card">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Expense' : 'Record Expense'}</DialogTitle>
                    <DialogDescription>
                        {initialData ? 'Update the details of this expense.' : 'Enter the details of the company expense.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div>
                        <Label>Description *</Label>
                        <Input
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="e.g. Office Supplies"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Amount *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div>
                            <Label>Category</Label>
                            <select
                                className="w-full mt-1 px-3 py-2 rounded-lg bg-card border border-border"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="Transport">Transport</option>
                                <option value="Data">Data</option>
                                <option value="OfficeSpace">Office Space</option>
                                <option value="Meal">Meal</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Currency</Label>
                            <Input value={formData.currency} disabled className="bg-muted" />
                        </div>
                        <div>
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex flex-row justify-between items-center w-full">
                        <div>
                            {initialData?.id && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={async () => {
                                        if (confirm("Are you sure you want to delete this expense?")) {
                                            setLoading(true)
                                            try {
                                                const res = await fetch(`/api/expenses?id=${initialData.id}`, { method: "DELETE" })
                                                if (res.ok) {
                                                    toast.success("Expense deleted successfully")
                                                    onSuccess()
                                                    onOpenChange(false)
                                                } else {
                                                    toast.error("Failed to delete expense")
                                                }
                                            } catch (e) {
                                                console.error(e)
                                                toast.error("Error deleting expense")
                                            }
                                            finally { setLoading(false) }
                                        }
                                    }}
                                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                >
                                    Delete
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {initialData ? "Update Expense" : "Record Expense"}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
