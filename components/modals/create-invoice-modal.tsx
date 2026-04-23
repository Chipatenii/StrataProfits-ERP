"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Trash2,
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
import { ConfirmModal } from "@/components/modals/confirm-modal"

interface CreateInvoiceModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    invoiceToEdit?: Invoice | null
}

const INPUT_CLS = "h-11 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
const SELECT_CLS = "mt-1 w-full h-11 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />

export function CreateInvoiceModal({ open, onOpenChange, onSuccess, invoiceToEdit }: CreateInvoiceModalProps) {
    const [loading, setLoading] = useState(false)
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
    const { data: clientsData, isLoading: loadingClients } = useSWR(open ? "/api/admin/clients" : null)
    const clients: Client[] = clientsData || []
    const [previewNumber, setPreviewNumber] = useState("")
    const [orgSettings, setOrgSettings] = useState<Partial<OrganizationSettings>>({})

    const [clientId, setClientId] = useState("")
    const [currency, setCurrency] = useState("ZMW")
    const [invoiceNumber, setInvoiceNumber] = useState("")
    const [orderNumber, setOrderNumber] = useState("")
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
    const [dueDate, setDueDate] = useState("")

    const [discountRate, setDiscountRate] = useState(0)
    const [adjustment, setAdjustment] = useState(0)

    const [customerNotes, setCustomerNotes] = useState("")
    const [terms, setTerms] = useState("")

    const [items, setItems] = useState<LineItem[]>([
        { id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: APP_CONFIG.FINANCE.DEFAULT_TAX_RATE }
    ])

    useEffect(() => {
        if (open) {
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
                fetch("/api/invoices/next-number")
                    .then(r => r.ok ? r.json() : null)
                    .then(data => data?.number && setPreviewNumber(data.number))
                    .catch(() => {})
            }
        }
    }, [open, invoiceToEdit])

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
        setConfirmDeleteOpen(true)
    }

    const performDelete = async () => {
        if (!invoiceToEdit) return
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
            <DialogContent className="flex flex-col max-w-2xl w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] p-0 gap-0 rounded-none sm:rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">

                {/* Sticky Header */}
                <div className="flex-none px-4 pt-5 pb-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                        {invoiceToEdit ? `Edit Invoice ${invoiceToEdit.invoice_number || ''}` : "New Invoice"}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Fill in the details below and add line items.
                    </DialogDescription>
                </div>

                {/* Scrollable Body */}
                <form id="invoice-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="px-4 sm:px-6 py-5 space-y-6">

                        <section>
                            <SectionHeading icon={<User size={15} />} title="Customer & Reference" />
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <Label>Customer <span className="text-rose-600">*</span></Label>
                                    {loadingClients ? (
                                        <div className="mt-1 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                    ) : (
                                        <select
                                            className={SELECT_CLS}
                                            value={clientId}
                                            onChange={(e) => setClientId(e.target.value)}
                                            required
                                        >
                                            <option value="">Select a customer...</option>
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
                                            className={`${INPUT_CLS} pr-3`}
                                            value={invoiceNumber}
                                            onChange={(e) => setInvoiceNumber(e.target.value)}
                                            placeholder={previewNumber || "Auto-generated"}
                                        />
                                        {!invoiceToEdit && !invoiceNumber && previewNumber && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono pointer-events-none select-none">
                                                {previewNumber}
                                            </span>
                                        )}
                                    </div>
                                    {!invoiceToEdit && !invoiceNumber && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Auto-assigned on save. Type to override.</p>
                                    )}
                                </div>
                                <div>
                                    <Label>Order / PO #</Label>
                                    <Input
                                        className={`mt-1 ${INPUT_CLS}`}
                                        value={orderNumber}
                                        onChange={(e) => setOrderNumber(e.target.value)}
                                        placeholder="PO-12345"
                                    />
                                </div>
                            </div>
                        </section>

                        <section>
                            <SectionHeading icon={<Calendar size={15} />} title="Dates & Currency" />
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <Label>Invoice Date</Label>
                                    <Input
                                        type="date"
                                        className={`mt-1 ${INPUT_CLS}`}
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Due Date</Label>
                                    <Input
                                        type="date"
                                        className={`mt-1 ${INPUT_CLS}`}
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Currency</Label>
                                    <select
                                        className={SELECT_CLS}
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                    >
                                        <option value="ZMW">ZMW (K)</option>
                                        <option value="USD">USD ($)</option>
                                    </select>
                                </div>
                            </div>
                        </section>

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
                                            className={`${INPUT_CLS} pr-16`}
                                            value={discountRate}
                                            onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                                        />
                                        {discountAmount > 0 && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-rose-600 font-medium font-mono">
                                                −{fmt(discountAmount)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label>Adjustment</Label>
                                    <Input
                                        type="number"
                                        className={`mt-1 ${INPUT_CLS}`}
                                        value={adjustment}
                                        placeholder="e.g. +/-50"
                                        onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4 space-y-2.5">
                            <TotalsRow label="Subtotal" value={`${currency} ${fmt(subTotal)}`} />
                            <TotalsRow label={`Discount (${discountRate}%)`} value={`− ${currency} ${fmt(discountAmount)}`} dimmed />
                            <TotalsRow label="Tax" value={`+ ${currency} ${fmt(taxTotal)}`} />
                            {adjustment !== 0 && <TotalsRow label="Adjustment" value={`${adjustment > 0 ? '+' : ''}${currency} ${fmt(adjustment)}`} dimmed />}
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5 flex justify-between items-center">
                                <span className="font-bold text-base text-slate-900 dark:text-white">Total ({currency})</span>
                                <span className="font-bold text-xl text-emerald-700 font-mono">{fmt(total)}</span>
                            </div>
                        </div>

                        <section>
                            <SectionHeading icon={<StickyNote size={15} />} title="Notes & Terms" />
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>Customer Notes</Label>
                                    <Textarea
                                        className="mt-1 min-h-[90px] rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                                        placeholder="Notes visible to the customer..."
                                        value={customerNotes}
                                        onChange={(e) => setCustomerNotes(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Terms & Conditions</Label>
                                    <Textarea
                                        className="mt-1 min-h-[90px] rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                                        placeholder="Payment terms, delivery details..."
                                        value={terms}
                                        onChange={(e) => setTerms(e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="h-2" />
                    </div>
                </form>

                {/* Sticky Footer */}
                <div className="flex-none border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 sm:px-6">
                    {/* Mobile: full-width stacked */}
                    <div className="flex flex-col gap-2 sm:hidden">
                        <button
                            form="invoice-form"
                            type="submit"
                            disabled={loading || !clientId}
                            className="w-full h-12 inline-flex items-center justify-center gap-2 text-base font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
                        >
                            {loading ? <Spinner /> : <Send size={16} />}
                            {invoiceToEdit ? "Update Invoice" : "Save & Send Invoice"}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                form="invoice-form"
                                type="submit"
                                name="download"
                                disabled={loading || !clientId}
                                className="h-11 inline-flex items-center justify-center gap-2 text-sm font-medium rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 disabled:opacity-50"
                            >
                                Save as Draft
                            </button>
                            <button
                                type="button"
                                className="h-11 inline-flex items-center justify-center text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </button>
                        </div>
                        {invoiceToEdit && (
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleDelete}
                                className="w-full h-11 inline-flex items-center justify-center gap-2 text-sm font-medium rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-50"
                            >
                                {loading ? <Spinner /> : <Trash2 size={15} />}
                                Delete Invoice
                            </button>
                        )}
                    </div>

                    {/* Desktop: side-by-side */}
                    <div className="hidden sm:flex items-center justify-between gap-3">
                        <div>
                            {invoiceToEdit && (
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={handleDelete}
                                    className="inline-flex items-center gap-2 h-10 px-3 text-sm font-medium rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-50"
                                >
                                    {loading ? <Spinner /> : <Trash2 size={15} />}
                                    Delete
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="h-10 inline-flex items-center px-4 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </button>
                            <button
                                form="invoice-form"
                                type="submit"
                                name="download"
                                disabled={loading || !clientId}
                                className="h-10 inline-flex items-center gap-2 px-4 text-sm font-medium rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 disabled:opacity-50"
                            >
                                {loading && <Spinner />}
                                Save as Draft
                            </button>
                            <button
                                form="invoice-form"
                                type="submit"
                                disabled={loading || !clientId}
                                className="h-10 inline-flex items-center gap-2 px-4 text-sm font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
                            >
                                {loading ? <Spinner /> : <Send size={15} />}
                                {invoiceToEdit ? "Update Invoice" : "Send Invoice"}
                            </button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
