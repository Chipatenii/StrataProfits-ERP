"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
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
            <DialogContent className="max-w-md glass-card">
                <DialogHeader>
                    <DialogTitle>Record Payment for {member.name}</DialogTitle>
                    <DialogDescription>
                        Enter the details of the payroll payment. The estimated amount for this period is ZMW {member.estimatedPayroll.toFixed(2)}.
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
                            />
                        </div>
                        <div>
                            <Label>Currency</Label>
                            <Input value={formData.currency} disabled className="bg-muted" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Payment Method *</Label>
                            <select
                                className="w-full mt-1 px-3 py-2 rounded-lg bg-card border border-border"
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
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Notes</Label>
                        <Input
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Optional notes..."
                        />
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Record Payment
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
