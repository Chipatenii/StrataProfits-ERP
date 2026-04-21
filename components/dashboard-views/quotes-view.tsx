"use client"

import { useEffect, useState } from "react"
import { Quote, OrganizationSettings } from "@/lib/types"
import { Plus, FileText, Edit2 } from "lucide-react"
import { CreateQuoteModal } from "@/components/modals/create-quote-modal"
import { PDFService } from "@/lib/pdf-service"

export function QuotesView() {
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [loading, setLoading] = useState(true)

    const [showCreate, setShowCreate] = useState(false)
    const [editingQuote, setEditingQuote] = useState<Quote | null>(null)
    const [orgSettings, setOrgSettings] = useState<Partial<OrganizationSettings>>({})

    useEffect(() => {
        fetchQuotes()
        fetch("/api/organization").then(r => r.ok ? r.json() : {}).then(setOrgSettings).catch(() => { })
    }, [])

    const fetchQuotes = async () => {
        try {
            const res = await fetch("/api/quotes")
            if (res.ok) setQuotes(await res.json())
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const statusStyle = (status: string) => {
        switch (status) {
            case "accepted": return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
            case "sent": return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
            case "rejected": return "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
            default: return "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading quotes...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Quotes & Proposals</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create and track client quotes</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" /> Create Quote
                </button>
            </div>

            <div className="space-y-2">
                {quotes.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                        <p className="text-base font-semibold text-slate-900 dark:text-white">No quotes yet</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create one to get started.</p>
                    </div>
                ) : (
                    quotes.map((quote) => (
                        <div key={quote.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 transition-colors flex justify-between items-center">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{quote.quote_number || "Draft"}</span>
                                    <span className={`px-2 py-0.5 text-[10px] rounded-md uppercase font-semibold ${statusStyle(quote.status)}`}>
                                        {quote.status}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {quote.client?.name} · {new Date(quote.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                    <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</div>
                                    <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{quote.currency} {quote.amount?.toLocaleString() || '0.00'}</div>
                                </div>
                                <div className="flex gap-1">
                                    {quote.status === 'draft' && (
                                        <button
                                            onClick={() => {
                                                setEditingQuote(quote)
                                                setShowCreate(true)
                                            }}
                                            className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                            title="Edit Draft"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => PDFService.generateQuotePDF(quote, orgSettings)}
                                        className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                        title="Download PDF"
                                    >
                                        <FileText size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <CreateQuoteModal
                open={showCreate}
                onOpenChange={(open) => {
                    setShowCreate(open)
                    if (!open) setEditingQuote(null)
                }}
                onSuccess={fetchQuotes}
                initialData={editingQuote}
            />
        </div>
    )
}
