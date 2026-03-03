"use client"

import { useEffect, useState } from "react"
import { Quote, OrganizationSettings } from "@/lib/types"
import { Plus, Loader2, FileText, Edit } from "lucide-react"
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
        fetch("/api/organization").then(r => r.ok ? r.json() : {}).then(setOrgSettings).catch(() => {})
    }, [])

    const fetchQuotes = async () => {
        try {
            const res = await fetch("/api/quotes")
            if (res.ok) {
                setQuotes(await res.json())
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Quotes & Proposals</h2>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Create Quote
                </button>
            </div>

            <div className="grid gap-4">
                {quotes.length === 0 ? (
                    <div className="glass-card p-12 text-center text-muted-foreground">
                        No quotes found. Create one to get started.
                    </div>
                ) : (
                    quotes.map((quote) => (
                        <div key={quote.id} className="glass-card p-4 rounded-lg flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{quote.quote_number || "Draft"}</span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full uppercase font-bold 
                                ${quote.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                            quote.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}
                            `}>
                                        {quote.status}
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {quote.client?.name} • {new Date(quote.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-right mr-2">
                                    <div className="text-xs text-muted-foreground">Total</div>
                                    <div className="font-bold text-blue-700">{quote.currency} {quote.amount?.toLocaleString() || '0.00'}</div>
                                </div>
                                <div className="flex gap-1">
                                    {quote.status === 'draft' && (
                                        <button
                                            onClick={() => {
                                                setEditingQuote(quote)
                                                setShowCreate(true)
                                            }}
                                            className="p-2 hover:bg-blue-50 rounded text-blue-600 transition-colors"
                                            title="Edit Draft"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => PDFService.generateQuotePDF(quote, orgSettings)}
                                        className="p-2 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                                        title="Download PDF"
                                    >
                                        <FileText size={18} />
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
