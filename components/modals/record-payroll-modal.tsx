"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface RecordPayrollModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    member: {
        id: string
        name: string
        estimatedPayroll: number
    } | null
    periodStart: string
    periodEnd: string
}

const INPUT_CLS = "rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
const SELECT_CLS = "flex h-10 w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"

export function RecordPayrollModal({ open, onOpenChange, onSuccess, member, periodStart, periodEnd }: RecordPayrollModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        amount: "",
        currency: "ZMW",
        payment_method: "bank_transfer",
        reference: "",
        notes: ""
    })

    useEffect(() => {
        if (open && member) {
            setFormData({
                amount: member.estimatedPayroll.toString(),
                currency: "ZMW",
                payment_method: "bank_transfer",
                reference: "",
                notes: `Payroll for ${new Date(periodStart).toLocaleString('default', { month: 'long', year: 'numeric' })}`
            })
        }
    }, [open, member, periodStart])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!member) return

        setLoading(true)

        try {
            const payload = {
                user_id: member.id,
                amount: parseFloat(formData.amount),
                currency: formData.currency,
                payment_method: formData.payment_method,
                reference: formData.reference,
                notes: formData.notes,
                period_start: periodStart,
                period_end: periodEnd
            }

            const res = await fetch("/api/admin/payroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error('Failed to record team payment')

            toast.success('Payment recorded successfully')
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error('Failed to record payment')
        } finally {
            setLoading(false)
        }
    }

    if (!member) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        Record Payment for {member.name}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Enter the details of the payroll payment. The estimated amount for this period is{" "}
                        <span className="font-mono font-semibold text-emerald-700">ZMW {member.estimatedPayroll.toFixed(2)}</span>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
                                className={`mt-1 ${INPUT_CLS}`}
                            />
                        </div>
                        <div>
                            <Label>Currency</Label>
                            <Input value={formData.currency} disabled className={`mt-1 bg-slate-50 dark:bg-slate-800 ${INPUT_CLS}`} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Payment Method *</Label>
                            <select
                                className={SELECT_CLS}
                                value={formData.payment_method}
                                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                required
                            >
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="mobile_money">Mobile Money</option>
                                <option value="cash">Cash</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <Label>Reference</Label>
                            <Input
                                value={formData.reference}
                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                placeholder="e.g. TXN-12345"
                                className={`mt-1 ${INPUT_CLS}`}
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Notes</Label>
                        <Input
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Optional notes..."
                            className={`mt-1 ${INPUT_CLS}`}
                        />
                    </div>

                    <DialogFooter className="mt-6">
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
                            {loading ? "Recording..." : "Record Payment"}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
