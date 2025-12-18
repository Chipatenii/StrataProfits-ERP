"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Invoice, InvoiceItem, Payment } from "@/lib/types"
import { Loader2, Download, Printer, CreditCard, CheckCircle, FileText } from "lucide-react"
import { PDFService } from "@/lib/pdf-service"

interface InvoiceDetailsModalProps {
    invoice: Invoice
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: () => void
}

export function InvoiceDetailsModal({ invoice, open, onOpenChange, onUpdate }: InvoiceDetailsModalProps) {
    const [loading, setLoading] = useState(true)
    const [fullInvoice, setFullInvoice] = useState<Invoice | null>(null)

    // Payment Form
    const [amount, setAmount] = useState("")
    const [method, setMethod] = useState("bank_transfer")
    const [ref, setRef] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [paymentTab, setPaymentTab] = useState(false)

    useEffect(() => {
        if (open && invoice.id) {
            fetchDetails()
        }
    }, [open, invoice])

    const fetchDetails = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/invoices?id=${invoice.id}`)
            if (res.ok) {
                const data = await res.json()
                setFullInvoice(data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

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
                alert(err.error || "Failed to record payment")
                return
            }

            // Success
            setPaymentTab(false)
            setAmount("")
            setRef("")
            fetchDetails() // Reload details to see new balance/status
            onUpdate() // Refresh parent list
        } catch (error) {
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const totalPaid = fullInvoice?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0
    const balanceDue = (fullInvoice?.amount || 0) - totalPaid

    if (!open) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl glass-card max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-xl">Invoice #{fullInvoice?.invoice_number || invoice.invoice_number || "Draft"}</DialogTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                {fullInvoice?.client?.name || invoice.client?.name}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fullInvoice && PDFService.generateInvoicePDF(fullInvoice)}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                                title="Download PDF"
                            >
                                <FileText className="w-5 h-5" />
                            </button>
                            <div className={`px-3 py-1 rounded-full border text-sm capitalize font-medium
                                ${(fullInvoice?.status || invoice.status) === 'paid' ? 'bg-green-100 text-green-700 border-green-200' :
                                    (fullInvoice?.status || invoice.status) === 'sent' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                        'bg-gray-100 text-gray-700 border-gray-200'}
                            `}>
                                {fullInvoice?.status || invoice.status}
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
                ) : fullInvoice ? (
                    <div className="space-y-6">
                        {/* Summary Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50/50 rounded-lg border border-gray-100">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Date Issued</p>
                                <p className="font-medium">{new Date(fullInvoice.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Total Amount</p>
                                <p className="font-medium text-lg text-blue-600">{fullInvoice.currency} {fullInvoice.amount.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Total Paid</p>
                                <p className="font-medium text-green-600">{fullInvoice.currency} {totalPaid.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Balance Due</p>
                                <p className="font-bold text-red-600">{fullInvoice.currency} {balanceDue > 0 ? balanceDue.toLocaleString() : "0.00"}</p>
                            </div>
                        </div>

                        {/* Tabs / Sections */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Line Items</h3>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Description</th>
                                            <th className="px-4 py-2 text-right">Qty</th>
                                            <th className="px-4 py-2 text-right">Unit Price</th>
                                            <th className="px-4 py-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {fullInvoice.items && fullInvoice.items.length > 0 ? (
                                            fullInvoice.items.map(item => (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-2">{item.description}</td>
                                                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                                                    <td className="px-4 py-2 text-right">{item.unit_price.toLocaleString()}</td>
                                                    <td className="px-4 py-2 text-right font-medium">{(item.quantity * item.unit_price).toLocaleString()}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">No line items (Flat amount)</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Payments Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <h3 className="font-semibold text-lg">Payments</h3>
                                {balanceDue > 0 && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setPaymentTab(!paymentTab)}
                                        className={paymentTab ? "bg-accent text-white hover:bg-accent/90" : ""}
                                    >
                                        <CreditCard className="w-3 h-3 mr-1" />
                                        Record Payment
                                    </Button>
                                )}
                            </div>

                            {paymentTab && (
                                <form onSubmit={handlePayment} className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
                                    <h4 className="font-medium mb-3 text-sm">New Payment Record (Internal Only)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <Label className="text-xs">Amount ({fullInvoice.currency})</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                max={balanceDue}
                                                value={amount}
                                                onChange={e => setAmount(e.target.value)}
                                                className="bg-white h-9"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Method</Label>
                                            <select
                                                value={method}
                                                onChange={e => setMethod(e.target.value)}
                                                className="w-full h-9 rounded-md border border-input bg-white px-3 text-sm"
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
                                                className="bg-white h-9"
                                                placeholder="Transaction ID"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-3 gap-2">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setPaymentTab(false)}>Cancel</Button>
                                        <Button type="submit" size="sm" disabled={isSubmitting}>
                                            {isSubmitting ? "Recording..." : "Save Payment"}
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {fullInvoice.payments && fullInvoice.payments.length > 0 ? (
                                <div className="space-y-2">
                                    {fullInvoice.payments.map(payment => (
                                        <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm border">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-green-100 p-1.5 rounded-full text-green-600">
                                                    <CheckCircle className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{fullInvoice.currency} {payment.amount.toLocaleString()}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(payment.created_at).toLocaleDateString()} via {payment.method?.replace('_', ' ')}</p>
                                                </div>
                                            </div>
                                            {payment.reference && (
                                                <span className="text-xs bg-white px-2 py-1 rounded border text-gray-500 font-mono">
                                                    Ref: {payment.reference}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No payments recorded yet.</p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-red-500">Failed to load details</div>
                )}
            </DialogContent>
        </Dialog>
    )
}
