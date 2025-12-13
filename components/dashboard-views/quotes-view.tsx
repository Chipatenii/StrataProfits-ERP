"use client"

import { useEffect, useState } from "react"
import { getQuotes } from "@/lib/data/quotes" // We will need to expose this via API or generic fetcher since this is client component
import { Quote } from "@/lib/types"
import { Plus, Loader2, FileText } from "lucide-react"
import { CreateQuoteModal } from "@/components/modals/create-quote-modal"

export function QuotesView() {
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [loading, setLoading] = useState(true)

    const [showCreate, setShowCreate] = useState(false)

    useEffect(() => {
        fetchQuotes()
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
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    {/* Need to sum items or get total from backend if added to view */}
                                    <div className="font-bold">{quote.currency} Total</div>
                                </div>
                                <button className="p-2 hover:bg-gray-100 rounded text-blue-600">
                                    <FileText size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <CreateQuoteModal
                open={showCreate}
                onOpenChange={setShowCreate}
                onSuccess={fetchQuotes}
            />
        </div>
    )
}
