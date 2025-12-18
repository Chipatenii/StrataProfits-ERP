"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { Invoice } from "@/lib/types"
import { PDFService } from "@/lib/pdf-service"

interface CreateReceiptModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function CreateReceiptModal({ open, onOpenChange, onSuccess }: CreateReceiptModalProps) {
    const [loading, setLoading] = useState(false)
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loadingInvoices, setLoadingInvoices] = useState(true)

    // Form State
    const [invoiceId, setInvoiceId] = useState("")
    const [amount, setAmount] = useState<number>(0)
    const [receiptNumber, setReceiptNumber] = useState("")
    const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
    const [reference, setReference] = useState("")
    const [notes, setNotes] = useState("")

    useEffect(() => {
        if (open) {
            fetchInvoices()
        }
    }, [open])

    const fetchInvoices = async () => {
        try {
            // Fetch only unpaid or partially paid invoices
            const res = await fetch("/api/invoices?status=sent")
            if (res.ok) {
                setInvoices(await res.json())
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingInvoices(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!invoiceId) return

        setLoading(true)
        try {
            const payload = {
                invoice_id: invoiceId,
                amount: amount,
                receipt_number: receiptNumber || undefined,
                method: paymentMethod,
                reference: reference || undefined,
                // notes: notes // API doesn't support notes yet, but maybe needed later
            }

            const res = await fetch("/api/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error("Failed to create receipt")

            // Download PDF if requested
            // @ts-ignore
            if ((e.nativeEvent as any).submitter?.name === "download") {
                const invoice = invoices.find(i => i.id === invoiceId)
                PDFService.generatePaymentPDF(payload as any, invoice?.invoice_number || 'N/A', invoice?.client?.name || 'Customer')
            }

            onSuccess()
            onOpenChange(false)
            // Reset
            setInvoiceId("")
            setAmount(0)
            setReceiptNumber("")
            setReference("")
        } catch (error) {
            console.error(error)
            alert("Failed to create receipt")
        } finally {
            setLoading(false)
        }
    }

    const handleInvoiceSelect = (id: string) => {
        setInvoiceId(id)
        const invoice = invoices.find(i => i.id === id)
        if (invoice) {
            setAmount(invoice.amount) // Default to full amount
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md glass-card">
                <DialogHeader>
                    <DialogTitle>Create Receipt</DialogTitle>
                    <DialogDescription>
                        Record a payment and generate a receipt for an invoice.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div>
                        <Label>Select Invoice</Label>
                        <select
                            className="w-full mt-1 px-3 py-2 rounded-lg bg-card border border-border"
                            value={invoiceId}
                            onChange={(e) => handleInvoiceSelect(e.target.value)}
                            required
                        >
                            <option value="">Select Invoice...</option>
                            {loadingInvoices ? (
                                <option disabled>Loading...</option>
                            ) : (
                                invoices.map(inv => (
                                    <option key={inv.id} value={inv.id}>
                                        {inv.invoice_number || 'INV-???'} - {inv.client?.name} ({inv.currency} {inv.amount})
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Amount Received</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                required
                            />
                        </div>
                        <div>
                            <Label>Receipt #</Label>
                            <Input
                                value={receiptNumber}
                                onChange={(e) => setReceiptNumber(e.target.value)}
                                placeholder="Auto"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Payment Method</Label>
                            <select
                                className="w-full px-3 py-2 rounded-lg bg-card border border-border mt-1"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cash">Cash</option>
                                <option value="mobile_money">Mobile Money</option>
                                <option value="card">Card</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <Label>Reference / Cheque #</Label>
                            <Input
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="Ref..."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            name="download"
                            variant="outline"
                            disabled={loading || !invoiceId}
                            className="border-green-200 text-green-700 hover:bg-green-50"
                        >
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save & Download PDF
                        </Button>
                        <Button type="submit" disabled={loading || !invoiceId} className="bg-green-600 hover:bg-green-700">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Generate Receipt
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
