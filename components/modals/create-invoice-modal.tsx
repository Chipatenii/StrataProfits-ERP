"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Plus, Trash2, Loader2, ChevronUp, ChevronDown,
    User, Calendar, FileText, Tag, StickyNote, Send
} from "lucide-react"
import { Client, Invoice } from "@/lib/types"
import { PDFService } from "@/lib/pdf-service"
import { toast } from "sonner"
import { APP_CONFIG } from "@/lib/config/constants"

interface CreateInvoiceModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    invoiceToEdit?: Invoice | null
}

interface LineItem {
    id: string
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
}

export function CreateInvoiceModal({ open, onOpenChange, onSuccess, invoiceToEdit }: CreateInvoiceModalProps) {
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<Client[]>([])
    const [loadingClients, setLoadingClients] = useState(true)
    const [previewNumber, setPreviewNumber] = useState("")

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
            fetchClients()
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

    const fetchClients = async () => {
        setLoadingClients(true)
        try {
            const res = await fetch("/api/admin/clients")
            if (res.ok) {
                const data = await res.json()
                setClients(data)
            }
        } catch (error) {
            console.error("[Invoice Modal] Error fetching clients:", error)
        } finally {
            setLoadingClients(false)
        }
    }

    const addItem = () => {
        setItems([...items, { id: Math.random().toString(), description: '', quantity: 1, unit_price: 0, tax_rate: APP_CONFIG.FINANCE.DEFAULT_TAX_RATE }])
    }

    const removeItem = (id: string) => {
        if (items.length === 1) return
        setItems(items.filter(i => i.id !== id))
    }

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === items.length - 1) return
        const newItems = [...items]
        const temp = newItems[index]
        if (direction === 'up') { newItems[index] = newItems[index - 1]; newItems[index - 1] = temp }
        else { newItems[index] = newItems[index + 1]; newItems[index + 1] = temp }
        setItems(newItems)
    }

    const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
    }

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
                PDFService.generateInvoicePDF({ ...payload as any, created_at: new Date().toISOString() })
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

    const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
                            <div className="mt-3 space-y-3">

                                {/* Desktop column headers */}
                                <div className="hidden md:grid md:grid-cols-[1fr_80px_96px_64px_40px] gap-2 px-1 text-xs uppercase text-muted-foreground font-semibold">
                                    <span>Description</span>
                                    <span className="text-right">Qty</span>
                                    <span className="text-right">Rate</span>
                                    <span className="text-right">Tax %</span>
                                    <span />
                                </div>

                                {items.map((item, index) => (
                                    <div key={item.id} className="rounded-xl border border-border/60 bg-card/50 p-3 md:p-2 space-y-3 md:space-y-0">

                                        {/* ── Mobile layout ── */}
                                        <div className="md:hidden space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-xs font-semibold text-muted-foreground mt-0.5">Item {index + 1}</span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveItem(index, 'up')}
                                                        disabled={index === 0}
                                                        className="p-2 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30 min-w-[36px] min-h-[36px] flex items-center justify-center"
                                                    >
                                                        <ChevronUp size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveItem(index, 'down')}
                                                        disabled={index === items.length - 1}
                                                        className="p-2 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30 min-w-[36px] min-h-[36px] flex items-center justify-center"
                                                    >
                                                        <ChevronDown size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(item.id)}
                                                        disabled={items.length === 1}
                                                        className="p-2 rounded-md hover:bg-destructive/10 text-destructive disabled:opacity-30 min-w-[36px] min-h-[36px] flex items-center justify-center"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <Textarea
                                                placeholder="Item description *"
                                                value={item.description}
                                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                className="resize-none bg-background min-h-[72px]"
                                                rows={2}
                                            />
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Qty</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        className="mt-1 h-11 text-right bg-background"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Rate</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        className="mt-1 h-11 text-right bg-background"
                                                        value={item.unit_price}
                                                        onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Tax %</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        className="mt-1 h-11 text-right bg-background"
                                                        value={item.tax_rate}
                                                        onChange={(e) => updateItem(item.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center pt-1 border-t border-border/40 text-sm">
                                                <span className="text-muted-foreground text-xs">Subtotal</span>
                                                <span className="font-semibold">{currency} {fmt(item.quantity * item.unit_price)}</span>
                                            </div>
                                        </div>

                                        {/* ── Desktop layout ── */}
                                        <div className="hidden md:grid md:grid-cols-[1fr_80px_96px_64px_40px] gap-2 items-start">
                                            <Textarea
                                                placeholder="Item description"
                                                value={item.description}
                                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                className="resize-none bg-background min-h-[2.5rem]"
                                                rows={2}
                                            />
                                            <Input
                                                type="number"
                                                min="0"
                                                className="text-right bg-background h-10"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                            />
                                            <Input
                                                type="number"
                                                min="0"
                                                className="text-right bg-background h-10"
                                                value={item.unit_price}
                                                onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                            />
                                            <Input
                                                type="number"
                                                min="0"
                                                className="text-right bg-background h-10"
                                                value={item.tax_rate}
                                                onChange={(e) => updateItem(item.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                                            />
                                            <div className="flex flex-col items-center gap-0.5 pt-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => moveItem(index, 'up')}
                                                    disabled={index === 0}
                                                    className="p-1.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-25"
                                                ><ChevronUp size={14} /></button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    disabled={items.length === 1}
                                                    className="p-1.5 rounded hover:bg-destructive/10 text-destructive disabled:opacity-25"
                                                ><Trash2 size={14} /></button>
                                                <button
                                                    type="button"
                                                    onClick={() => moveItem(index, 'down')}
                                                    disabled={index === items.length - 1}
                                                    className="p-1.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-25"
                                                ><ChevronDown size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addItem}
                                    className="w-full sm:w-auto border-dashed border-primary/40 text-primary hover:bg-primary/5 gap-1.5"
                                >
                                    <Plus size={15} /> Add Line Item
                                </Button>
                            </div>
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

// ── Helpers ───────────────────────────────────────────────

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
            <span className="text-primary">{icon}</span>
            {title}
            <div className="flex-1 h-px bg-border/50 ml-1" />
        </div>
    )
}

function TotalsRow({ label, value, dimmed }: { label: string; value: string; dimmed?: boolean }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className={dimmed ? "text-muted-foreground" : "text-foreground/80"}>{label}</span>
            <span className={`tabular-nums font-medium ${dimmed ? "text-muted-foreground" : ""}`}>{value}</span>
        </div>
    )
}
