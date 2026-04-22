"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileText, CreditCard, StickyNote, Trash2, Download } from "lucide-react"
import { Invoice, OrganizationSettings, Payment } from "@/lib/types"
import { PDFService } from "@/lib/pdf-service"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/format"
import { SectionHeading } from "@/components/ui/section-heading"

interface CreateReceiptModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    initialData?: (Payment & { notes?: string }) | null
}

const PAYMENT_METHODS = [
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "cash", label: "Cash" },
    { value: "mobile_money", label: "Mobile Money" },
    { value: "card", label: "Card" },
    { value: "other", label: "Other" },
]

const INPUT_CLS = "h-11 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
const SELECT_CLS = "mt-1 w-full h-11 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />

export function CreateReceiptModal({ open, onOpenChange, onSuccess, initialData }: CreateReceiptModalProps) {
    const [loading, setLoading] = useState(false)
    const { data: invoicesData, isLoading: loadingInvoices } = useSWR(open ? "/api/invoices" : null)
    const invoices: Invoice[] = invoicesData || []
    const [previewNumber, setPreviewNumber] = useState("")
    const [orgSettings, setOrgSettings] = useState<Partial<OrganizationSettings>>({})

    const [invoiceId, setInvoiceId] = useState("")
    const [amount, setAmount] = useState<number>(0)
    const [receiptNumber, setReceiptNumber] = useState("")
    const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
    const [reference, setReference] = useState("")
    const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])
    const [notes, setNotes] = useState("")

    const selectedInvoice = invoices.find(i => i.id === invoiceId)
    const invoiceBalance = selectedInvoice ? selectedInvoice.amount : 0

    useEffect(() => {
        if (open) {
            fetch("/api/organization").then(r => r.ok ? r.json() : {}).then(setOrgSettings).catch(() => {})
            if (initialData) {
                setInvoiceId(initialData.invoice_id)
                setAmount(initialData.amount)
                setReceiptNumber(initialData.receipt_number || "")
                setPaymentMethod(initialData.method || "bank_transfer")
                setReference(initialData.reference || "")
                setPaidAt(initialData.paid_at ? new Date(initialData.paid_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
                setNotes(initialData.notes || "")
                setPreviewNumber("")
            } else {
                setInvoiceId("")
                setAmount(0)
                setReceiptNumber("")
                setPaymentMethod("bank_transfer")
                setReference("")
                setPaidAt(new Date().toISOString().split('T')[0])
                setNotes("")
                fetch("/api/payments/next-number")
                    .then(r => r.ok ? r.json() : null)
                    .then(data => data?.number && setPreviewNumber(data.number))
                    .catch(() => {})
            }
        }
    }, [open, initialData])

    const handleInvoiceSelect = (id: string) => {
        setInvoiceId(id)
        const invoice = invoices.find(i => i.id === id)
        if (invoice) setAmount(invoice.amount)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!invoiceId) return

        setLoading(true)
        try {
            const payload = {
                invoice_id: invoiceId,
                amount,
                receipt_number: receiptNumber || undefined,
                method: paymentMethod,
                reference: reference || undefined,
                paid_at: paidAt ? new Date(paidAt).toISOString() : undefined,
            }

            const url = initialData?.id ? `/api/payments?id=${initialData.id}` : "/api/payments"
            const method = initialData?.id ? "PATCH" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error(`Failed to ${initialData ? 'update' : 'create'} receipt`)

            if ((e.nativeEvent as any).submitter?.name === "download") {
                const saved = await res.json()
                const invoice = invoices.find(i => i.id === invoiceId)
                PDFService.generatePaymentPDF(saved, invoice?.invoice_number || 'N/A', invoice?.client?.name || 'Customer', orgSettings)
            }

            onSuccess()
            onOpenChange(false)
            setInvoiceId("")
            setAmount(0)
            setReceiptNumber("")
            setReference("")
            toast.success(initialData ? "Receipt updated successfully" : "Receipt created successfully")
        } catch (error) {
            console.error(error)
            toast.error(`Failed to ${initialData ? 'update' : 'create'} receipt`)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!initialData?.id) return
        if (!confirm("Are you sure you want to delete this receipt? This cannot be undone.")) return
        setLoading(true)
        try {
            const res = await fetch(`/api/payments?id=${initialData.id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Receipt deleted successfully")
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error("Failed to delete receipt")
            }
        } catch (e) {
            toast.error("Error deleting receipt")
        } finally {
            setLoading(false)
        }
    }

    const fmt = formatCurrency

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex flex-col max-w-lg w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] p-0 gap-0 rounded-none sm:rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">

                <div className="flex-none px-4 pt-5 pb-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                        {initialData ? 'Edit Receipt' : 'Record Payment'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Record a payment received and generate a receipt.
                    </DialogDescription>
                </div>

                <form id="receipt-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="px-4 sm:px-6 py-5 space-y-6">

                        <section>
                            <SectionHeading icon={<FileText size={15} />} title="Invoice" />
                            <div className="mt-3">
                                <Label>Select Invoice <span className="text-rose-600">*</span></Label>
                                {loadingInvoices ? (
                                    <div className="mt-1 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                ) : (
                                    <select
                                        className={SELECT_CLS}
                                        value={invoiceId}
                                        onChange={(e) => handleInvoiceSelect(e.target.value)}
                                        required
                                    >
                                        <option value="">Select an invoice...</option>
                                        {invoices.map(inv => (
                                            <option key={inv.id} value={inv.id}>
                                                {inv.invoice_number || 'INV-???'} — {inv.client?.name} ({inv.currency} {fmt(inv.amount)})
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {selectedInvoice && (
                                    <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Invoice Total</span>
                                        <span className="font-semibold font-mono text-slate-900 dark:text-white">
                                            {selectedInvoice.currency} {fmt(invoiceBalance)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section>
                            <SectionHeading icon={<CreditCard size={15} />} title="Payment Details" />
                            <div className="mt-3 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Amount Received <span className="text-rose-600">*</span></Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className={`mt-1 font-mono ${INPUT_CLS}`}
                                            value={amount}
                                            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                            required
                                        />
                                        {selectedInvoice && amount < invoiceBalance && amount > 0 && (
                                            <p className="text-xs text-amber-600 mt-1">
                                                Partial payment — {selectedInvoice.currency} {fmt(invoiceBalance - amount)} remaining.
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>Payment Date</Label>
                                        <Input
                                            type="date"
                                            className={`mt-1 ${INPUT_CLS}`}
                                            value={paidAt}
                                            onChange={(e) => setPaidAt(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label>Payment Method</Label>
                                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {PAYMENT_METHODS.map(m => (
                                            <button
                                                key={m.value}
                                                type="button"
                                                onClick={() => setPaymentMethod(m.value)}
                                                className={`h-10 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                                    paymentMethod === m.value
                                                        ? "bg-emerald-700 text-white border-emerald-700"
                                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-slate-700 dark:text-slate-300"
                                                }`}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Reference / Cheque #</Label>
                                        <Input
                                            className={`mt-1 ${INPUT_CLS}`}
                                            value={reference}
                                            onChange={(e) => setReference(e.target.value)}
                                            placeholder="e.g. TXN-123456"
                                        />
                                    </div>
                                    <div>
                                        <Label>Receipt #</Label>
                                        <div className="relative mt-1">
                                            <Input
                                                className={`${INPUT_CLS} pr-3`}
                                                value={receiptNumber}
                                                onChange={(e) => setReceiptNumber(e.target.value)}
                                                placeholder={previewNumber || "Auto-generated"}
                                            />
                                            {!initialData && !receiptNumber && previewNumber && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono pointer-events-none select-none">
                                                    {previewNumber}
                                                </span>
                                            )}
                                        </div>
                                        {!initialData && !receiptNumber && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Auto-assigned on save.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <SectionHeading icon={<StickyNote size={15} />} title="Notes" />
                            <Textarea
                                className="mt-3 min-h-[80px] rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                                placeholder="Internal notes about this payment..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </section>

                        {amount > 0 && (
                            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount Being Recorded</span>
                                <span className="text-xl font-bold font-mono text-emerald-700">
                                    {selectedInvoice?.currency || 'ZMW'} {fmt(amount)}
                                </span>
                            </div>
                        )}

                        <div className="h-2" />
                    </div>
                </form>

                <div className="flex-none border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 sm:px-6">
                    {/* Mobile */}
                    <div className="flex flex-col gap-2 sm:hidden">
                        <button form="receipt-form" type="submit" disabled={loading || !invoiceId}
                            className="w-full h-12 inline-flex items-center justify-center gap-2 text-base font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50">
                            {loading ? <Spinner /> : <FileText size={16} />}
                            {initialData ? "Update Receipt" : "Generate Receipt"}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                            <button form="receipt-form" type="submit" name="download" disabled={loading || !invoiceId}
                                className="h-11 inline-flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 disabled:opacity-50">
                                <Download size={14} /> Save & PDF
                            </button>
                            <button type="button" className="h-11 inline-flex items-center justify-center text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => onOpenChange(false)}>Cancel</button>
                        </div>
                        {initialData && (
                            <button type="button" disabled={loading} onClick={handleDelete}
                                className="w-full h-11 inline-flex items-center justify-center gap-2 text-sm font-medium rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-50">
                                {loading ? <Spinner /> : <Trash2 size={15} />}
                                Delete Receipt
                            </button>
                        )}
                    </div>

                    {/* Desktop */}
                    <div className="hidden sm:flex items-center justify-between gap-3">
                        <div>
                            {initialData && (
                                <button type="button" disabled={loading} onClick={handleDelete}
                                    className="inline-flex items-center gap-2 h-10 px-3 text-sm font-medium rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-50">
                                    {loading ? <Spinner /> : <Trash2 size={15} />}
                                    Delete
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" className="h-10 inline-flex items-center px-4 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => onOpenChange(false)}>Cancel</button>
                            <button form="receipt-form" type="submit" name="download" disabled={loading || !invoiceId}
                                className="h-10 inline-flex items-center gap-1.5 px-4 text-sm font-medium rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 disabled:opacity-50">
                                {loading && <Spinner />}
                                <Download size={14} /> Save & PDF
                            </button>
                            <button form="receipt-form" type="submit" disabled={loading || !invoiceId}
                                className="h-10 inline-flex items-center gap-2 px-4 text-sm font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50">
                                {loading ? <Spinner /> : <FileText size={15} />}
                                {initialData ? "Update Receipt" : "Generate Receipt"}
                            </button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
