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
import { Client, OrganizationSettings, Quote, QuoteItem } from "@/lib/types"
import { PDFService } from "@/lib/pdf-service"
import { toast } from "sonner"
import { APP_CONFIG } from "@/lib/config/constants"
import { LineItem, LineItemsTable } from "./shared-line-items"
import { formatCurrency } from "@/lib/format"
import { SectionHeading } from "@/components/ui/section-heading"
import { TotalsRow } from "@/components/ui/totals-row"

interface CreateQuoteModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    initialData?: Quote | null
}

const INPUT_CLS = "h-11 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
const SELECT_CLS = "mt-1 w-full h-11 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />

export function CreateQuoteModal({ open, onOpenChange, onSuccess, initialData }: CreateQuoteModalProps) {
    const [loading, setLoading] = useState(false)
    const { data: clientsData, isLoading: loadingClients } = useSWR(open ? "/api/admin/clients" : null)
    const clients: Client[] = clientsData || []
    const [previewNumber, setPreviewNumber] = useState("")
    const [orgSettings, setOrgSettings] = useState<Partial<OrganizationSettings>>({})

    const [clientId, setClientId] = useState("")
    const [currency, setCurrency] = useState("ZMW")
    const [quoteNumber, setQuoteNumber] = useState("")
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0])
    const [validUntil, setValidUntil] = useState("")

    const [discountRate, setDiscountRate] = useState(0)
    const [adjustment, setAdjustment] = useState(0)

    const [notes, setNotes] = useState("")
    const [terms, setTerms] = useState("")

    const [items, setItems] = useState<LineItem[]>([
        { id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: APP_CONFIG.FINANCE.DEFAULT_TAX_RATE }
    ])

    useEffect(() => {
        if (open) {
            fetch("/api/organization").then(r => r.ok ? r.json() : {}).then(setOrgSettings).catch(() => {})
            if (initialData) {
                setClientId(initialData.client_id || "")
                setCurrency(initialData.currency || "ZMW")
                setQuoteNumber(initialData.quote_number || "")
                setValidUntil(initialData.valid_until ? initialData.valid_until.split('T')[0] : "")
                setDiscountRate(initialData.discount_rate || 0)
                setAdjustment(initialData.adjustment || 0)
                setNotes(initialData.notes || "")
                setTerms(initialData.terms || "")
                if (initialData.items && Array.isArray(initialData.items)) {
                    setItems(initialData.items.map((i: QuoteItem) => ({
                        id: i.id || Math.random().toString(),
                        description: i.description,
                        quantity: i.quantity,
                        unit_price: i.unit_price,
                        tax_rate: i.tax_rate || 0
                    })))
                }
                setPreviewNumber("")
            } else {
                setClientId("")
                setQuoteNumber("")
                setDiscountRate(0)
                setAdjustment(0)
                setNotes("")
                setTerms("")
                setItems([{ id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: APP_CONFIG.FINANCE.DEFAULT_TAX_RATE }])
                fetch("/api/quotes/next-number")
                    .then(r => r.ok ? r.json() : null)
                    .then(data => data?.number && setPreviewNumber(data.number))
                    .catch(() => {})
            }
        }
    }, [open, initialData])

    const subTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    const discountAmount = subTotal * (discountRate / 100)
    const taxTotal = items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * (item.tax_rate / 100)), 0)
    const total = subTotal - discountAmount + taxTotal + adjustment

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clientId) return

        setLoading(true)
        try {
            const payload = {
                client_id: clientId,
                currency,
                quote_number: quoteNumber || undefined,
                valid_until: validUntil || undefined,
                notes,
                terms,
                discount_rate: discountRate,
                discount_amount: discountAmount,
                adjustment,
                amount: total,
                status: "draft",
                items: items.filter(i => i.description.trim() !== "").map(i => ({
                    description: i.description,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    tax_rate: i.tax_rate,
                    tax_amount: (i.quantity * i.unit_price) * (i.tax_rate / 100)
                }))
            }

            const res = await fetch("/api/quotes", {
                method: initialData ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(initialData ? { ...payload, id: initialData.id } : payload)
            })

            if (!res.ok) throw new Error("Failed to save quote")

            if ((e.nativeEvent as any).submitter?.name === "download") {
                const saved = await res.json()
                PDFService.generateQuotePDF(saved, orgSettings)
            }

            onSuccess()
            onOpenChange(false)
            setClientId("")
            setItems([{ id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: APP_CONFIG.FINANCE.DEFAULT_TAX_RATE }])
            setQuoteNumber("")
            setDiscountRate(0)
            setAdjustment(0)
            setNotes("")
            setTerms("")
            toast.success(initialData ? "Quote updated successfully" : "Quote created successfully")
        } catch (error) {
            console.error(error)
            toast.error("Failed to save quote")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!initialData?.id) return
        if (!confirm("Are you sure you want to delete this quote? This cannot be undone.")) return
        setLoading(true)
        try {
            const res = await fetch(`/api/quotes?id=${initialData.id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Quote deleted successfully")
                onSuccess()
                onOpenChange(false)
            } else {
                toast.error("Failed to delete quote")
            }
        } catch (e) {
            toast.error("Error occurred while deleting quote")
        } finally {
            setLoading(false)
        }
    }

    const fmt = formatCurrency

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex flex-col max-w-2xl w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] p-0 gap-0 rounded-none sm:rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">

                <div className="flex-none px-4 pt-5 pb-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                        {initialData ? 'Edit Quote / Proposal' : 'New Quote / Proposal'}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Fill in the details below and add line items.
                    </DialogDescription>
                </div>

                <form id="quote-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="px-4 sm:px-6 py-5 space-y-6">

                        <section>
                            <SectionHeading icon={<User size={15} />} title="Client & Reference" />
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <Label>Client <span className="text-rose-600">*</span></Label>
                                    {loadingClients ? (
                                        <div className="mt-1 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                    ) : (
                                        <select
                                            className={SELECT_CLS}
                                            value={clientId}
                                            onChange={(e) => setClientId(e.target.value)}
                                            required
                                        >
                                            <option value="">Select a client...</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <Label>Quote #</Label>
                                    <div className="relative mt-1">
                                        <Input
                                            className={`${INPUT_CLS} pr-3`}
                                            value={quoteNumber}
                                            onChange={(e) => setQuoteNumber(e.target.value)}
                                            placeholder={previewNumber || "Auto-generated"}
                                        />
                                        {!initialData && !quoteNumber && previewNumber && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono pointer-events-none select-none">
                                                {previewNumber}
                                            </span>
                                        )}
                                    </div>
                                    {!initialData && !quoteNumber && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Auto-assigned on save. Type to override.</p>
                                    )}
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
                            <SectionHeading icon={<Calendar size={15} />} title="Dates" />
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>Quote Date</Label>
                                    <Input
                                        type="date"
                                        className={`mt-1 ${INPUT_CLS}`}
                                        value={quoteDate}
                                        onChange={(e) => setQuoteDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Valid Until</Label>
                                    <Input
                                        type="date"
                                        className={`mt-1 ${INPUT_CLS}`}
                                        value={validUntil}
                                        onChange={(e) => setValidUntil(e.target.value)}
                                    />
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
                                        <Input type="number" min="0" max="100" className={`${INPUT_CLS} pr-16`}
                                            value={discountRate} onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)} />
                                        {discountAmount > 0 && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-rose-600 font-medium font-mono">
                                                −{fmt(discountAmount)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label>Adjustment</Label>
                                    <Input type="number" className={`mt-1 ${INPUT_CLS}`}
                                        value={adjustment} placeholder="e.g. +/-50"
                                        onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)} />
                                </div>
                            </div>
                        </section>

                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4 space-y-2.5">
                            <TotalsRow label="Subtotal" value={`${currency} ${fmt(subTotal)}`} />
                            <TotalsRow label={`Discount (${discountRate}%)`} value={`− ${currency} ${fmt(discountAmount)}`} dimmed />
                            <TotalsRow label="Tax" value={`+ ${currency} ${fmt(taxTotal)}`} />
                            {adjustment !== 0 && <TotalsRow label="Adjustment" value={`${adjustment > 0 ? '+' : ''}${currency} ${fmt(adjustment)}`} dimmed />}
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5 flex justify-between items-center">
                                <span className="font-bold text-base text-slate-900 dark:text-white">Quote Total ({currency})</span>
                                <span className="font-bold text-xl text-emerald-700 font-mono">{fmt(total)}</span>
                            </div>
                        </div>

                        <section>
                            <SectionHeading icon={<StickyNote size={15} />} title="Notes & Terms" />
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label>Notes</Label>
                                    <Textarea className="mt-1 min-h-[90px] rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                                        placeholder="Additional notes for the client..."
                                        value={notes} onChange={(e) => setNotes(e.target.value)} />
                                </div>
                                <div>
                                    <Label>Terms & Conditions</Label>
                                    <Textarea className="mt-1 min-h-[90px] rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                                        placeholder="Validity, payment terms, etc..."
                                        value={terms} onChange={(e) => setTerms(e.target.value)} />
                                </div>
                            </div>
                        </section>

                        <div className="h-2" />
                    </div>
                </form>

                <div className="flex-none border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 sm:px-6">
                    <div className="flex flex-col gap-2 sm:hidden">
                        <button form="quote-form" type="submit" disabled={loading || !clientId}
                            className="w-full h-12 inline-flex items-center justify-center gap-2 text-base font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50">
                            {loading ? <Spinner /> : <Send size={16} />}
                            {initialData ? "Update Quote" : "Create Quote"}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                            <button form="quote-form" type="submit" name="download" disabled={loading || !clientId}
                                className="h-11 inline-flex items-center justify-center gap-2 text-sm font-medium rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 disabled:opacity-50">
                                Save & PDF
                            </button>
                            <button type="button"
                                className="h-11 inline-flex items-center justify-center text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={() => onOpenChange(false)}>Cancel</button>
                        </div>
                        {initialData?.id && (
                            <button type="button" disabled={loading} onClick={handleDelete}
                                className="w-full h-11 inline-flex items-center justify-center gap-2 text-sm font-medium rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-50">
                                {loading ? <Spinner /> : <Trash2 size={15} />}
                                Delete Quote
                            </button>
                        )}
                    </div>

                    <div className="hidden sm:flex items-center justify-between gap-3">
                        <div>
                            {initialData?.id && (
                                <button type="button" disabled={loading} onClick={handleDelete}
                                    className="inline-flex items-center gap-2 h-10 px-3 text-sm font-medium rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-50">
                                    {loading ? <Spinner /> : <Trash2 size={15} />}
                                    Delete
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button"
                                className="h-10 inline-flex items-center px-4 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                onClick={() => onOpenChange(false)}>Cancel</button>
                            <button form="quote-form" type="submit" name="download" disabled={loading || !clientId}
                                className="h-10 inline-flex items-center gap-2 px-4 text-sm font-medium rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 disabled:opacity-50">
                                {loading && <Spinner />}
                                Save & Download PDF
                            </button>
                            <button form="quote-form" type="submit" disabled={loading || !clientId}
                                className="h-10 inline-flex items-center gap-2 px-4 text-sm font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50">
                                {loading ? <Spinner /> : <Send size={15} />}
                                {initialData ? "Update Quote" : "Create Quote"}
                            </button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
