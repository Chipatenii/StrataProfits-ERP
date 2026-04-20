"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Plus, Trash2, Loader2, ChevronUp, ChevronDown,
    User, Calendar, FileText, Tag, StickyNote, Send
} from "lucide-react"
import { Client, Invoice, OrganizationSettings } from "@/lib/types"
import { PDFService } from "@/lib/pdf-service"
import { toast } from "sonner"
import { APP_CONFIG } from "@/lib/config/constants"
import { LineItem, LineItemsTable } from "./shared-line-items"
import { formatCurrency } from "@/lib/format"
import { SectionHeading } from "@/components/ui/section-heading"
import { TotalsRow } from "@/components/ui/totals-row"

interface CreateInvoiceModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    invoiceToEdit?: Invoice | null
}

export function CreateInvoiceModal({ open, onOpenChange, onSuccess, invoiceToEdit }: CreateInvoiceModalProps) {
    const [loading, setLoading] = useState(false)
    const { data: clientsData, isLoading: loadingClients } = useSWR(open ? "/api/admin/clients" : null)
    const clients: Client[] = clientsData || []
    const [previewNumber, setPreviewNumber] = useState("")
    const [orgSettings, setOrgSettings] = useState<Partial<OrganizationSettings>>({})

    // Form State
    const [clientId, setClientId] = useState("")
    const [currency, setCurrency] = useState("ZMW")
    const [invoiceNumber, setInvoiceNumber] = useState("")
    const [orderNumber, setOrderNumber] = useState("")
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
    const [dueDate, setDueDate] = useState("")

    // Financials
    const [discountRate, setDiscountRate] = useState(0)
    const [adjustment, setAdjustment] = useState(0)

    // Notes & Terms
    const [customerNotes, setCustomerNotes] = useState("")
    const [terms, setTerms] = useState("")

    const [items, setItems] = useState<LineItem[]>([
        { id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: APP_CONFIG.FINANCE.DEFAULT_TAX_RATE }
    ])

    useEffect(() => {
        if (open) {
            // Fetch organization settings for PDF generation
            fetch("/api/organization").then(r => r.ok ? r.json() : {}).then(setOrgSettings).catch(() => {})
            if (invoiceToEdit) {
                setClientId(invoiceToEdit.client_id)
                setCurrency(invoiceToEdit.currency || "ZMW")
                setInvoiceNumber(invoiceToEdit.invoice_number || "")
                setOrderNumber(invoiceToEdit.order_number || "")
                setInvoiceDate(new Date(invoiceToEdit.created_at).toISOString().split('T')[0])
                setDueDate(invoiceToEdit.due_date ? new Date(invoiceToEdit.due_date).toISOString().split('T')[0] : "")
                setDiscountRate(invoiceToEdit.discount_rate || 0)
                setAdjustment(invoiceToEdit.adjustment || 0)
                setCustomerNotes(invoiceToEdit.customer_notes || "")
                setTerms(invoiceToEdit.terms || "")
                if (invoiceToEdit.items && invoiceToEdit.items.length > 0) {
                    setItems(invoiceToEdit.items.map(item => ({
                        id: item.id || Math.random().toString(),
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        tax_rate: item.tax_rate || 0
                    })))
                }
                setPreviewNumber("")
            } else {
                setClientId("")
                setCurrency("ZMW")
                setInvoiceNumber("")
                setOrderNumber("")
                setInvoiceDate(new Date().toISOString().split('T')[0])
                setDueDate("")
                setDiscountRate(0)
                setAdjustment(0)
                setCustomerNotes("")
                setTerms("")
                setItems([{ id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: APP_CONFIG.FINANCE.DEFAULT_TAX_RATE }])
                // Fetch preview number for new invoice
                fetch("/api/invoices/next-number")
                    .then(r => r.ok ? r.json() : null)
                    .then(data => data?.number && setPreviewNumber(data.number))
                    .catch(() => {})
            }
        }
    }, [open, invoiceToEdit])

    // Calculations
    const subTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    const discountAmount = subTotal * (discountRate / 100)
    const taxTotal = items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * (item.tax_rate / 100)), 0)
    const total = subTotal - discountAmount + taxTotal + adjustment

    const handleSubmit = async (e: React.FormEvent, overrideStatus?: 'draft' | 'sent') => {
        e.preventDefault()
        if (!clientId) return

        const submitterName = (e.nativeEvent as any).submitter?.name
        const isDownload = submitterName === "download"
        const invoiceStatus = overrideStatus ?? (invoiceToEdit ? invoiceToEdit.status : (isDownload ? 'draft' : 'sent'))

        setLoading(true)
        try {
            const payload = {
                client_id: clientId,
                currency,
                invoice_number: invoiceNumber || undefined,
                order_number: orderNumber || undefined,
                due_date: dueDate || undefined,
                customer_notes: customerNotes,
                terms: terms,
                discount_rate: discountRate,
                discount_amount: discountAmount,
                adjustment: adjustment,
                amount: total,
                status: invoiceStatus,
                items: items.filter(i => i.description.trim() !== "").map(i => ({
                    description: i.description,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    tax_rate: i.tax_rate,
                    tax_amount: (i.quantity * i.unit_price) * (i.tax_rate / 100)
                }))
            }

            const url = invoiceToEdit ? `/api/invoices?id=${invoiceToEdit.id}` : "/api/invoices"
            const method = invoiceToEdit ? "PATCH" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || `Failed to ${invoiceToEdit ? 'update' : 'create'} invoice`)
            }

            if (isDownload) {
                // FIX: use server response so PDF reflects server-assigned invoice_number and created_at, not local payload
                const saved = await res.json()
                PDFService.generateInvoicePDF(saved, orgSettings)
            }

            onSuccess()
            onOpenChange(false)
            setClientId("")
            setItems([{ id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: APP_CONFIG.FINANCE.DEFAULT_TAX_RATE }])
            setOrderNumber("")
            setDiscountRate(0)
            setAdjustment(0)
            setCustomerNotes("")
            setTerms("")
            toast.success(invoiceToEdit ? "Invoice updated successfully" : "Invoice created successfully")
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Failed to create invoice")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!invoiceToEdit) return
        if (!confirm("Are you sure you want to delete this invoice? This cannot be undone.")) return
        setLoading(true)
        try {
            const res = await fetch(`/api/invoices?id=${invoiceToEdit.id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Invoice deleted successfully")
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error("Failed to delete invoice")
            }
        } catch (e) {
            toast.error("Error occurred while deleting invoice")
        } finally {
            setLoading(false)
        }
    }

    const fmt = formatCurrency

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex flex-col max-w-2xl w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] p-0 gap-0 rounded-none sm:rounded-2xl overflow-hidden glass-card border-border/30">

                {/* ── Sticky Header ── */}
                <div className="flex-none px-4 pt-5 pb-4 sm:px-6 border-b border-border/50 bg-card/80 backdrop-blur-sm">
                    <DialogTitle className="text-lg font-bold leading-tight">
                        {invoiceToEdit ? `Edit Invoice ${invoiceToEdit.invoice_number || ''}` : "New Invoice"}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                        Fill in the details below and add line items.
                    </DialogDescription>
                </div>

                {/* ── Scrollable Body ── */}
                <form
                    id="invoice-form"
                    onSubmit={handleSubmit}
                    className="flex-1 overflow-y-auto"
                >
                    <div className="px-4 sm:px-6 py-5 space-y-6">

                        {/* Section 1 – Customer & Reference */}
                        <section>
                            <SectionHeading icon={<User size={15} />} title="Customer & Reference" />
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <Label className="required-label">Customer <span className="text-destructive">*</span></Label>
                                    {loadingClients ? (
                                        <div className="mt-1 h-10 rounded-md bg-muted animate-pulse" />
                                    ) : (
                                        <select
                                            className="mt-1 w-full h-11 px-3 rounded-md bg-background border border-border focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
                                            value={clientId}
                                            onChange={(e) => setClientId(e.target.value)}
                                            required
                                        >
                                            <option value="">Select a customer…</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <Label>Invoice #</Label>
                                    <div className="relative mt-1">
                                        <Input
                                            className="h-11 bg-background pr-3"
                                            value={invoiceNumber}
                                            onChange={(e) => setInvoiceNumber(e.target.value)}
                                            placeholder={previewNumber || "Auto-generated"}
                                        />
                                        {!invoiceToEdit && !invoiceNumber && previewNumber && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60 font-mono pointer-events-none select-none">
                                                {previewNumber}
                                            </span>
                                        )}
                                    </div>
                                    {!invoiceToEdit && !invoiceNumber && (
                                        <p className="text-xs text-muted-foreground mt-1">Auto-assigned on save. Type to override.</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Order / PO #</Label>
                                    <Input
                                        className="mt-1 h-11 bg-background"
                                        value={orderNumber}
                                        onChange={(e) => setOrderNumber(e.target.value)}
                                        placeholder="PO-12345"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Section 2 – Dates & Currency */}
                        <section>
                            <SectionHeading icon={<Calendar size={15} />} title="Dates & Currency" />
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <Label>Invoice Date</Label>
                                    <Input
                                        type="date"
                                        className="mt-1 h-11 bg-background"
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Due Date</Label>
                                    <Input
                                        type="date"
                                        className="mt-1 h-11 bg-background"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Currency</Label>
                                    <select
                                        className="mt-1 w-full h-11 px-3 rounded-md bg-background border border-border focus:ring-2 focus:ring-primary outline-none text-sm"
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                    >
                                        <option value="ZMW">ZMW (K)</option>
                                        <option value="USD">USD ($)</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Section 3 – Line Items */}
                        <section>
                            <SectionHeading icon={<FileText size={15} />} title="Line Items" />
                            <LineItemsTable 
                                items={items} 
                                setItems={setItems} 
                                currency={currency} 
                                fmt={fmt} 
                                defaultTaxRate={APP_CONFIG.FINANCE.DEFAULT_TAX_RATE} 
                            />
                        </section>

                        {/* Section 4 – Adjustments */}
                        <section>
                            <SectionHeading icon={<Tag size={15} />} title="Adjustments" />
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>Discount (%)</Label>
                                    <div className="mt-1 relative">
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            className="h-11 bg-background pr-16"
                                            value={discountRate}
                                            onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                                        />
                                        {discountAmount > 0 && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-destructive font-medium tabular-nums">
                                                −{fmt(discountAmount)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label>Adjustment</Label>
                                    <Input
                                        type="number"
                                        className="mt-1 h-11 bg-background"
                                        value={adjustment}
                                        placeholder="e.g. +/-50"
                                        onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Section 5 – Totals summary (read-only) */}
                        <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-2.5">
                            <TotalsRow label="Subtotal" value={`${currency} ${fmt(subTotal)}`} />
                            <TotalsRow label={`Discount (${discountRate}%)`} value={`− ${currency} ${fmt(discountAmount)}`} dimmed />
                            <TotalsRow label="Tax" value={`+ ${currency} ${fmt(taxTotal)}`} />
                            {adjustment !== 0 && <TotalsRow label="Adjustment" value={`${adjustment > 0 ? '+' : ''}${currency} ${fmt(adjustment)}`} dimmed />}
                            <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                                <span className="font-bold text-base">Total ({currency})</span>
                                <span className="font-bold text-xl text-primary tabular-nums">{fmt(total)}</span>
                            </div>
                        </div>

                        {/* Section 6 – Notes & Terms */}
                        <section>
                            <SectionHeading icon={<StickyNote size={15} />} title="Notes & Terms" />
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>Customer Notes</Label>
                                    <Textarea
                                        className="mt-1 min-h-[90px] bg-background"
                                        placeholder="Notes visible to the customer…"
                                        value={customerNotes}
                                        onChange={(e) => setCustomerNotes(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Terms & Conditions</Label>
                                    <Textarea
                                        className="mt-1 min-h-[90px] bg-background"
                                        placeholder="Payment terms, delivery details…"
                                        value={terms}
                                        onChange={(e) => setTerms(e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Bottom padding so content isn't hidden behind sticky footer */}
                        <div className="h-2" />
                    </div>
                </form>

                {/* ── Sticky Footer ── */}
                <div className="flex-none border-t border-border/50 bg-card/90 backdrop-blur-sm px-4 py-3 sm:px-6">
                    {/* Mobile: full-width stacked */}
                    <div className="flex flex-col gap-2 sm:hidden">
                        <Button
                            form="invoice-form"
                            type="submit"
                            disabled={loading || !clientId}
                            className="w-full h-12 gap-2 text-base bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
                            {invoiceToEdit ? "Update Invoice" : "Save & Send Invoice"}
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                form="invoice-form"
                                type="submit"
                                name="download"
                                variant="outline"
                                disabled={loading || !clientId}
                                className="h-11 border-primary/20 text-primary hover:bg-primary/5"
                            >
                                Save as Draft
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-11"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                        {invoiceToEdit && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={loading}
                                onClick={handleDelete}
                                className="w-full h-11 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={15} />}
                                Delete Invoice
                            </Button>
                        )}
                    </div>

                    {/* Desktop: side-by-side */}
                    <div className="hidden sm:flex items-center justify-between gap-3">
                        <div>
                            {invoiceToEdit && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={loading}
                                    onClick={handleDelete}
                                    className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-2 h-10"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={15} />}
                                    Delete
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="ghost" className="h-10" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button
                                form="invoice-form"
                                type="submit"
                                name="download"
                                variant="outline"
                                disabled={loading || !clientId}
                                className="h-10 border-primary/20 text-primary hover:bg-primary/5"
                            >
                                {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                                Save as Draft
                            </Button>
                            <Button
                                form="invoice-form"
                                type="submit"
                                disabled={loading || !clientId}
                                className="h-10 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={15} />}
                                {invoiceToEdit ? "Update Invoice" : "Send Invoice"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}


