"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Invoice, OrganizationSettings } from "@/lib/types"
import { CreditCard, CheckCircle2, FileText } from "lucide-react"
import { PDFService } from "@/lib/pdf-service"
import { toast } from "sonner"

interface InvoiceDetailsModalProps {
    invoice: Invoice
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: () => void
}

const STATUS_PILL: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
    sent: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
    draft: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
    overdue: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50",
}

const INPUT_CLS = "h-9 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"

export function InvoiceDetailsModal({ invoice, open, onOpenChange, onUpdate }: InvoiceDetailsModalProps) {
    const { data: fullInvoiceData, isLoading, mutate } = useSWR(
        open && invoice.id ? `/api/invoices?id=${invoice.id}` : null
    )
    const fullInvoice: Invoice | null = fullInvoiceData || null
    const loading = isLoading && !fullInvoiceData

    const [amount, setAmount] = useState("")
    const [method, setMethod] = useState("bank_transfer")
    const [ref, setRef] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [paymentTab, setPaymentTab] = useState(false)
    const [orgSettings, setOrgSettings] = useState<Partial<OrganizationSettings>>({})

    useEffect(() => {
        if (open && invoice.id) {
            fetch("/api/organization").then(r => r.ok ? r.json() : {}).then(setOrgSettings).catch(() => {})
        }
    }, [open, invoice])

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || !fullInvoice) return

        setIsSubmitting(true)
        try {
            const res = await fetch("/api/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invoice_id: fullInvoice.id,
                    amount: parseFloat(amount),
                    currency: fullInvoice.currency,
                    method,
                    reference: ref
                })
            })

            if (!res.ok) {
                const err = await res.json()
                toast.error(err.error || "Failed to record payment")
                return
            }

            setPaymentTab(false)
            setAmount("")
            setRef("")
            mutate()
            onUpdate()
            toast.success("Payment recorded successfully")
        } catch (error) {
            console.error(error)
            toast.error("An unexpected error occurred")
        } finally {
            setIsSubmitting(false)
        }
    }

    const totalPaid = fullInvoice?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
    const balanceDue = (fullInvoice?.amount || 0) - totalPaid
    const status = (fullInvoice?.status || invoice.status) as string

    if (!open) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-start gap-3">
                        <div>
                            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                                Invoice #{fullInvoice?.invoice_number || invoice.invoice_number || "Draft"}
                            </DialogTitle>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {fullInvoice?.client?.name || invoice.client?.name}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fullInvoice && PDFService.generateInvoicePDF(fullInvoice, orgSettings)}
                                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Download PDF"
                            >
                                <FileText className="w-4 h-4" />
                            </button>
                            <span
                                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium capitalize ${
                                    STATUS_PILL[status] || STATUS_PILL.draft
                                }`}
                            >
                                {status}
                            </span>
                        </div>
                    </div>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent" />
                    </div>
                ) : fullInvoice ? (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                            <div>
                                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Date Issued</p>
                                <p className="font-medium text-slate-900 dark:text-white mt-0.5">{new Date(fullInvoice.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Amount</p>
                                <p className="font-mono font-semibold text-base text-emerald-700 mt-0.5">
                                    {fullInvoice.currency} {fullInvoice.amount.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Paid</p>
                                <p className="font-mono font-medium text-emerald-700 mt-0.5">
                                    {fullInvoice.currency} {totalPaid.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Balance Due</p>
                                <p className={`font-mono font-bold mt-0.5 ${balanceDue > 0 ? "text-rose-600" : "text-slate-500"}`}>
                                    {fullInvoice.currency} {balanceDue > 0 ? balanceDue.toLocaleString() : "0.00"}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-semibold text-sm text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">Line Items</h3>
                            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wide font-semibold">Description</th>
                                            <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wide font-semibold">Qty</th>
                                            <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wide font-semibold">Unit Price</th>
                                            <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wide font-semibold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {fullInvoice.items && fullInvoice.items.length > 0 ? (
                                            fullInvoice.items.map(item => (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{item.description}</td>
                                                    <td className="px-4 py-2 text-right font-mono text-slate-900 dark:text-white">{item.quantity}</td>
                                                    <td className="px-4 py-2 text-right font-mono text-slate-900 dark:text-white">{item.unit_price.toLocaleString()}</td>
                                                    <td className="px-4 py-2 text-right font-mono font-medium text-slate-900 dark:text-white">
                                                        {(item.quantity * item.unit_price).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-4 text-center text-slate-500 dark:text-slate-400">
                                                    No line items (Flat amount)
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Payments</h3>
                                {balanceDue > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setPaymentTab(!paymentTab)}
                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                            paymentTab
                                                ? "bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800"
                                                : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        <CreditCard className="w-3 h-3" />
                                        Record Payment
                                    </button>
                                )}
                            </div>

                            {paymentTab && (
                                <form
                                    onSubmit={handlePayment}
                                    className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/10 animate-in fade-in slide-in-from-top-2"
                                >
                                    <h4 className="font-semibold mb-3 text-sm text-slate-900 dark:text-white">New Payment Record</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <Label className="text-xs">Amount ({fullInvoice.currency})</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                max={balanceDue}
                                                value={amount}
                                                onChange={e => setAmount(e.target.value)}
                                                className={INPUT_CLS}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Method</Label>
                                            <select
                                                value={method}
                                                onChange={e => setMethod(e.target.value)}
                                                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                            >
                                                <option value="bank_transfer">Bank Transfer</option>
                                                <option value="mobile_money">Mobile Money</option>
                                                <option value="cash">Cash</option>
                                                <option value="card">Card / Online</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Reference (Opt)</Label>
                                            <Input
                                                value={ref}
                                                onChange={e => setRef(e.target.value)}
                                                className={INPUT_CLS}
                                                placeholder="Transaction ID"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentTab(false)}
                                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                                        >
                                            {isSubmitting && <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />}
                                            {isSubmitting ? "Recording..." : "Save Payment"}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {fullInvoice.payments && fullInvoice.payments.length > 0 ? (
                                <div className="space-y-2">
                                    {fullInvoice.payments.map(payment => (
                                        <div
                                            key={payment.id}
                                            className="flex justify-between items-center p-3 rounded-lg text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-mono font-medium text-slate-900 dark:text-white">
                                                        {fullInvoice.currency} {payment.amount.toLocaleString()}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        {new Date(payment.created_at).toLocaleDateString()} via {payment.method?.replace("_", " ")}
                                                    </p>
                                                </div>
                                            </div>
                                            {payment.reference && (
                                                <span className="text-[11px] font-mono px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                                                    Ref: {payment.reference}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400 italic">No payments recorded yet.</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-rose-600">Failed to load details</div>
                )}
            </DialogContent>
        </Dialog>
    )
}
