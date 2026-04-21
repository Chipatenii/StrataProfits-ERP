"use client"

import { useState } from "react"
import useSWR from "swr"
import { Plus, Calendar } from "lucide-react"
import type { Deal } from "@/lib/types"
import { CreateDealModal } from "@/components/modals/create-deal-modal"
import { AttachmentList } from "@/components/attachment-list"

export function PipelineView() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [dealToEdit, setDealToEdit] = useState<Deal | null>(null)

  const fetcher = (url: string) => fetch(url).then(res => {
    if (!res.ok) return res.text().then(t => { throw new Error(t) })
    return res.json()
  })
  const { data: deals = [], error: swrError, mutate: fetchDeals } = useSWR<Deal[]>("/api/admin/deals", fetcher)
  const error = swrError ? (swrError as Error).message : null

  const stages = ["NewLead", "Qualified", "ProposalSent", "Negotiation", "Won", "Lost"]

  const getStageStyle = (stage: string) => {
    switch (stage) {
      case "NewLead":
        return { dot: "bg-slate-400", pill: "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300" }
      case "Qualified":
        return { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" }
      case "ProposalSent":
        return { dot: "bg-amber-600", pill: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400" }
      case "Negotiation":
        return { dot: "bg-emerald-600", pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" }
      case "Won":
        return { dot: "bg-emerald-700", pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" }
      case "Lost":
        return { dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400" }
      default:
        return { dot: "bg-slate-400", pill: "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300" }
    }
  }

  const totalPipelineValue = deals.reduce((sum, d) => sum + (d.estimated_value || 0), 0)
  const wonValue = deals.filter(d => d.stage === "Won").reduce((sum, d) => sum + (d.estimated_value || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Sales Pipeline</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track deals and opportunities</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Deal
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total deals</p>
          <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{deals.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pipeline value</p>
          <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">K{totalPipelineValue.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Won value</p>
          <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">K{wonValue.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-col gap-5 w-full">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage)
          const style = getStageStyle(stage)

          return (
            <div key={stage} className="w-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{stage}</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${style.pill}`}>
                    {stageDeals.length}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 transition-colors cursor-pointer"
                    onClick={() => {
                      setDealToEdit(deal)
                      setShowCreateModal(true)
                    }}
                  >
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-1 truncate">{deal.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 truncate">{deal.client?.name || "No Client"}</p>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{deal.estimated_value.toLocaleString()}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{deal.currency}</span>
                    </div>
                    {deal.expected_close_date && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(deal.expected_close_date).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex justify-end mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <AttachmentList entityType="deal" entityId={deal.id} />
                    </div>
                  </div>
                ))}
              </div>

              {stageDeals.length === 0 && (
                <div className="h-14 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                  No deals
                </div>
              )}
            </div>
          )
        })}
      </div>

      <CreateDealModal
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open)
          if (!open) setDealToEdit(null)
        }}
        onSuccess={fetchDeals}
        initialData={dealToEdit}
      />
    </div>
  )
}
