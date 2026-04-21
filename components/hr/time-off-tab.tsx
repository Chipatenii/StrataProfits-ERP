"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Calendar, Plus, Check, X,
    Palmtree, Thermometer, User, Ban
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TimeOffRequest } from "@/lib/types"
import { toast } from "sonner"

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    vacation: { label: "Vacation", icon: Palmtree, color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400" },
    sick: { label: "Sick Leave", icon: Thermometer, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400" },
    personal: { label: "Personal", icon: User, color: "text-slate-700 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300" },
    unpaid: { label: "Unpaid", icon: Ban, color: "text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400" },
    other: { label: "Other", icon: Calendar, color: "text-slate-600 bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300" },
}

const STATUS_BADGE: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    rejected: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
    cancelled: "bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400",
}

interface TimeOffTabProps {
    isAdmin: boolean
}

export function TimeOffTab({ isAdmin }: TimeOffTabProps) {
    const [requests, setRequests] = useState<TimeOffRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ type: "vacation", start_date: "", end_date: "", days_count: 1, reason: "" })

    const fetchRequests = useCallback(async () => {
        try {
            const res = await fetch("/api/hr/time-off")
            if (res.ok) setRequests(await res.json())
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchRequests() }, [fetchRequests])

    const handleSubmit = async () => {
        if (!form.start_date || !form.end_date) { toast.error("Start and end dates are required"); return }
        setSaving(true)
        try {
            const res = await fetch("/api/hr/time-off", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            toast.success("Time-off request submitted")
            setShowForm(false)
            setForm({ type: "vacation", start_date: "", end_date: "", days_count: 1, reason: "" })
            fetchRequests()
        } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
    }

    const handleAction = async (id: string, status: "approved" | "rejected") => {
        try {
            const res = await fetch(`/api/hr/time-off/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            toast.success(`Request ${status}`)
            fetchRequests()
        } catch (e: any) { toast.error(e.message) }
    }

    const pendingCount = requests.filter(r => r.status === "pending").length

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Time Off</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {isAdmin ? `${pendingCount} pending request${pendingCount !== 1 ? "s" : ""} to review` : "Request and track your time off"}
                    </p>
                </div>
                <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors">
                    <Plus className="w-4 h-4" /> Request Time Off
                </button>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No time-off requests</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Submit your first time-off request to get started.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {requests.map(req => {
                        const config = TYPE_CONFIG[req.type] || TYPE_CONFIG.other
                        const Icon = config.icon
                        return (
                            <div key={req.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{config.label}</span>
                                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${STATUS_BADGE[req.status]}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()} · {req.days_count} day{req.days_count !== 1 ? "s" : ""}
                                    </p>
                                    {req.reason && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{req.reason}</p>}
                                    {isAdmin && req.user && (
                                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                                            Requested by {req.user.full_name}
                                        </p>
                                    )}
                                </div>
                                {isAdmin && req.status === "pending" && (
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => handleAction(req.id, "approved")} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md transition-colors">
                                            <Check className="w-3.5 h-3.5" /> Approve
                                        </button>
                                        <button onClick={() => handleAction(req.id, "rejected")} className="inline-flex items-center gap-1 px-3 py-1.5 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold rounded-md transition-colors">
                                            <X className="w-3.5 h-3.5" /> Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">Request Time Off</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                            <select
                                value={form.type}
                                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            >
                                {Object.entries(TYPE_CONFIG).map(([key, val]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Start Date</label>
                                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="rounded-lg border-slate-200 dark:border-slate-800" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">End Date</label>
                                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="rounded-lg border-slate-200 dark:border-slate-800" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Days</label>
                            <Input type="number" min={0.5} step={0.5} value={form.days_count} onChange={e => setForm(f => ({ ...f, days_count: parseFloat(e.target.value) || 1 }))} className="rounded-lg border-slate-200 dark:border-slate-800" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reason <span className="text-slate-500 dark:text-slate-400 font-normal">(optional)</span></label>
                            <textarea
                                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                placeholder="Brief reason for this request..."
                                value={form.reason}
                                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                            <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                                {saving ? "Submitting…" : "Submit Request"}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
