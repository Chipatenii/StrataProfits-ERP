"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Calendar, Plus, Clock, Check, X, AlertCircle,
    Palmtree, Thermometer, User, Ban
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TimeOffRequest } from "@/lib/types"
import { toast } from "sonner"

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    vacation: { label: "Vacation", icon: Palmtree, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400" },
    sick: { label: "Sick Leave", icon: Thermometer, color: "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400" },
    personal: { label: "Personal", icon: User, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400" },
    unpaid: { label: "Unpaid", icon: Ban, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400" },
    other: { label: "Other", icon: Calendar, color: "text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-400" },
}

const STATUS_BADGE: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Time Off</h2>
                    <p className="text-sm text-muted-foreground">
                        {isAdmin ? `${pendingCount} pending request${pendingCount !== 1 ? "s" : ""} to review` : "Request and track your time off"}
                    </p>
                </div>
                <Button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl">
                    <Plus className="w-4 h-4 mr-2" /> Request Time Off
                </Button>
            </div>

            {/* Requests List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">No time-off requests</h3>
                    <p className="text-muted-foreground text-sm">Submit your first time-off request to get started.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map(req => {
                        const config = TYPE_CONFIG[req.type] || TYPE_CONFIG.other
                        const Icon = config.icon
                        return (
                            <div key={req.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="font-bold text-foreground">{config.label}</span>
                                        <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_BADGE[req.status]}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()} · {req.days_count} day{req.days_count !== 1 ? "s" : ""}
                                    </p>
                                    {req.reason && <p className="text-sm text-muted-foreground mt-1 truncate">{req.reason}</p>}
                                    {isAdmin && req.user && (
                                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                                            Requested by {req.user.full_name}
                                        </p>
                                    )}
                                </div>
                                {isAdmin && req.status === "pending" && (
                                    <div className="flex gap-2 shrink-0">
                                        <Button size="sm" onClick={() => handleAction(req.id, "approved")} className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg">
                                            <Check className="w-4 h-4 mr-1" /> Approve
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleAction(req.id, "rejected")} className="text-red-600 border-red-200 hover:bg-red-50 rounded-lg">
                                            <X className="w-4 h-4 mr-1" /> Reject
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Request Form Modal */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-md bg-card rounded-2xl shadow-2xl border border-border/50">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Request Time Off</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">Type</label>
                            <select
                                value={form.type}
                                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-foreground text-sm"
                            >
                                {Object.entries(TYPE_CONFIG).map(([key, val]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">Start Date</label>
                                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="rounded-xl" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">End Date</label>
                                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="rounded-xl" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">Days</label>
                            <Input type="number" min={0.5} step={0.5} value={form.days_count} onChange={e => setForm(f => ({ ...f, days_count: parseFloat(e.target.value) || 1 }))} className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">Reason <span className="text-muted-foreground font-normal">(optional)</span></label>
                            <textarea
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-background text-foreground resize-none h-20"
                                placeholder="Brief reason for this request..."
                                value={form.reason}
                                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancel</Button>
                            <Button onClick={handleSubmit} disabled={saving} className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl px-6">
                                {saving ? "Submitting…" : "Submit Request"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
