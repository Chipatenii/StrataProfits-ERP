"use client"

import { useState, useEffect } from "react"
import { Plus, DollarSign, Calendar, ArrowRight } from "lucide-react"
import { Deal } from "@/lib/types"

export function PipelineView() {
    const [deals, setDeals] = useState<Deal[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDeals()
    }, [])

    const fetchDeals = async () => {
        try {
            const response = await fetch("/api/admin/deals")
            if (response.ok) {
                const data = await response.json()
                setDeals(data)
            }
        } catch (error) {
            console.error("Error loading deals:", error)
        } finally {
            setLoading(false)
        }
    }

    const stages = ["NewLead", "Qualified", "ProposalSent", "Negotiation", "Won", "Lost"]

    const getStageColor = (stage: string) => {
        switch (stage) {
            case 'NewLead': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'Qualified': return 'bg-purple-100 text-purple-700 border-purple-200'
            case 'ProposalSent': return 'bg-amber-100 text-amber-700 border-amber-200'
            case 'Negotiation': return 'bg-orange-100 text-orange-700 border-orange-200'
            case 'Won': return 'bg-green-100 text-green-700 border-green-200'
            case 'Lost': return 'bg-red-100 text-red-700 border-red-200'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    return (
        <div className="space-y-6 overflow-x-auto">
            <div className="flex justify-between items-center min-w-[800px]">
                <div>
                    <h2 className="text-2xl font-bold">Sales Pipeline</h2>
                    <p className="text-muted-foreground">Track deals and opportunities</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4" />
                    New Deal
                </button>
            </div>

            <div className="flex gap-4 min-w-[1200px] pb-4">
                {stages.map(stage => (
                    <div key={stage} className="flex-1 min-w-[280px]">
                        <div className={`p-3 rounded-lg border mb-3 font-semibold ${getStageColor(stage)}`}>
                            {stage} <span className="text-xs opacity-70 ml-1">({deals.filter(d => d.stage === stage).length})</span>
                        </div>
                        <div className="space-y-3">
                            {deals.filter(d => d.stage === stage).map(deal => (
                                <div key={deal.id} className="glass-card p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer">
                                    <h4 className="font-medium mb-1">{deal.title}</h4>
                                    <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                                        <span>{deal.client?.name || "No Client"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                        <DollarSign className="w-3 h-3" />
                                        {deal.currency} {deal.estimated_value.toLocaleString()}
                                    </div>
                                    {deal.expected_close_date && (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(deal.expected_close_date).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {deals.filter(d => d.stage === stage).length === 0 && (
                                <div className="h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-400">
                                    Empty
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
