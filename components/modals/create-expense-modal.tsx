"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Expense } from "@/lib/types"

interface CreateExpenseModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    initialData?: Expense | null
}

const INPUT_CLS = "mt-1 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
const SELECT_CLS = "mt-1 w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"

export function CreateExpenseModal({ open, onOpenChange, onSuccess, initialData }: CreateExpenseModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        amount: "",
        category: "Other",
        description: "",
        currency: "ZMW",
        date: new Date().toISOString().split("T")[0]
    })

    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({
                    amount: initialData.amount?.toString() || "",
                    category: initialData.category || "Other",
                    description: initialData.description || "",
                    currency: initialData.currency || "ZMW",
                    date: initialData.date || new Date().toISOString().split("T")[0]
                })
            } else {
                setFormData({
                    amount: "",
                    category: "Other",
                    description: "",
                    currency: "ZMW",
                    date: new Date().toISOString().split("T")[0]
                })
            }
        }
    }, [open, initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = { ...formData, amount: parseFloat(formData.amount) }

            const url = initialData?.id ? `/api/expenses?id=${initialData.id}` : "/api/expenses"
            const method = initialData?.id ? "PATCH" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error(`Failed to ${initialData ? "update" : "create"} expense`)

            onSuccess()
            onOpenChange(false)
            toast.success(initialData ? "Expense updated successfully" : "Expense recorded successfully")
        } catch (error) {
            console.error(error)
            toast.error(`Failed to ${initialData ? "update" : "create"} expense`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {initialData ? "Edit Expense" : "Record Expense"}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        {initialData ? "Update the details of this expense." : "Enter the details of the company expense."}
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
                            className={INPUT_CLS}
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
                                className={INPUT_CLS}
                            />
                        </div>
                        <div>
                            <Label>Category</Label>
                            <select
                                className={SELECT_CLS}
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
                            <Input value={formData.currency} disabled className={`mt-1 bg-slate-50 dark:bg-slate-800 rounded-lg border-slate-200 dark:border-slate-800`} />
                        </div>
                        <div>
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className={INPUT_CLS}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex flex-row justify-between items-center w-full">
                        <div>
                            {initialData?.id && (
                                <button
                                    type="button"
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
                                            } finally {
                                                setLoading(false)
                                            }
                                        }
                                    }}
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                            >
                                {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
                                {initialData ? "Update Expense" : "Record Expense"}
                            </button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
