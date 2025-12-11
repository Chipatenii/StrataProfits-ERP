"use client"

import { useState, useEffect } from "react"
import { Plus, DollarSign, Calendar, ChevronRight } from "lucide-react"
import type { Deal } from "@/lib/types"
import { CreateDealModal } from "@/components/modals/create-deal-modal"
import { AttachmentList } from "@/components/attachment-list"

export function PipelineView() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Mobile: Active stage state for accordion-like behavior or tabs? 
  // For "Stacked Cards", we usually mean stacking the columns.
  // We'll stack them vertically on mobile.

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
      case "NewLead":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "Qualified":
        return "bg-purple-100 text-purple-700 border-purple-200"
      case "ProposalSent":
        return "bg-amber-100 text-amber-700 border-amber-200"
      case "Negotiation":
        return "bg-orange-100 text-orange-700 border-orange-200"
      case "Won":
        return "bg-green-100 text-green-700 border-green-200"
      case "Lost":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Sales Pipeline</h2>
          <p className="text-muted-foreground">Track deals and opportunities</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          New Deal
        </button>
      </div>

      {/* 
        Mobile: Vertical Stack (flex-col) 
        Desktop: Horizontal Scroll (flex-row + overflow-x-auto)
      */}
      <div className="flex flex-col md:flex-row gap-4 pb-4 md:overflow-x-auto md:min-w-0">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage)
          return (
            <div key={stage} className="flex-1 md:min-w-[280px] md:max-w-[320px]">
              {/* Header */}
              <div className={`p-3 rounded-lg border mb-3 font-semibold flex items-center justify-between ${getStageColor(stage)}`}>
                <span className="flex items-center gap-2">
                  {stage}
                </span>
                <span className="text-xs font-bold py-0.5 px-2 bg-white/30 rounded-full">
                  {stageDeals.length}
                </span>
              </div>

              {/* Deals Grid/Stack */}
              <div className="space-y-3">
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="glass-card p-4 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer border border-border/40"
                  >
                    <h4 className="font-medium mb-1 truncate">{deal.title}</h4>
                    <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                      <span className="truncate max-w-[150px]">{deal.client?.name || "No Client"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <DollarSign className="w-3 h-3 text-green-600" />
                      <span className="text-green-700">{deal.estimated_value.toLocaleString()}</span> {deal.currency}
                    </div>
                    {deal.expected_close_date && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(deal.expected_close_date).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex justify-end mt-2 pt-2 border-t border-border/30">
                      <AttachmentList entityType="deal" entityId={deal.id} />
                    </div>
                  </div>
                ))}

                {stageDeals.length === 0 && (
                  <div className="h-16 md:h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-400">
                    <span className="md:hidden">No deals</span>
                    <span className="hidden md:inline">Empty</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <CreateDealModal open={showCreateModal} onOpenChange={setShowCreateModal} onSuccess={fetchDeals} />
    </div>
  )
}
