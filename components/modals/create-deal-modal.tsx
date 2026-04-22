"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Client, Deal } from "@/lib/types"
import { toast } from "sonner"

interface CreateDealModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    initialData?: Deal | null
}

const INPUT_CLS = "mt-1 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
const SELECT_CLS = "mt-1 w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"

export function CreateDealModal({ open, onOpenChange, onSuccess, initialData }: CreateDealModalProps) {
    const [formData, setFormData] = useState({
        title: "",
        client_id: "",
        stage: "NewLead",
        estimated_value: "0",
        currency: "ZMW",
        probability: "20",
        expected_close_date: "",
    })
    const { data: clientsData } = useSWR(open ? "/api/admin/clients" : null)
    const clients: Client[] = clientsData || []
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({
                    title: initialData.title || "",
                    client_id: initialData.client_id || "",
                    stage: initialData.stage || "NewLead",
                    estimated_value: initialData.estimated_value?.toString() || "0",
                    currency: initialData.currency || "ZMW",
                    probability: initialData.probability?.toString() || "20",
                    expected_close_date: initialData.expected_close_date || "",
                })
            } else {
                setFormData({
                    title: "",
                    client_id: "",
                    stage: "NewLead",
                    estimated_value: "0",
                    currency: "ZMW",
                    probability: "20",
                    expected_close_date: "",
                })
            }
        }
    }, [open, initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title) return

        setIsLoading(true)

        try {
            const payload = {
                ...formData,
                estimated_value: parseFloat(formData.estimated_value) || 0,
                probability: parseInt(formData.probability) || 0,
                client_id: formData.client_id || null,
                expected_close_date: formData.expected_close_date || null
            }

            const url = initialData?.id ? `/api/admin/deals?id=${initialData.id}` : "/api/admin/deals"
            const method = initialData?.id ? "PATCH" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || `Failed to ${initialData?.id ? "update" : "create"} deal`)
            }

            setFormData({
                title: "", client_id: "", stage: "NewLead", estimated_value: "0", currency: "ZMW", probability: "20", expected_close_date: ""
            })
            onSuccess()
            onOpenChange(false)
            toast.success(initialData?.id ? "Deal updated successfully" : "Deal created successfully")
        } catch (error) {
            console.error(`Error ${initialData?.id ? "updating" : "creating"} deal:`, error)
            toast.error(error instanceof Error ? error.message : `Failed to ${initialData?.id ? "update" : "create"} deal`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {initialData?.id ? "Edit Deal" : "New Deal"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="title">Deal Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className={INPUT_CLS}
                            placeholder="e.g. Website Redesign"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="client">Client</Label>
                            <select
                                id="client"
                                value={formData.client_id}
                                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                className={SELECT_CLS}
                            >
                                <option value="">Prospective (New)</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="stage">Stage</Label>
                            <select
                                id="stage"
                                value={formData.stage}
                                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                                className={SELECT_CLS}
                            >
                                <option value="NewLead">New Lead</option>
                                <option value="Qualified">Qualified</option>
                                <option value="ProposalSent">Proposal Sent</option>
                                <option value="Negotiation">Negotiation</option>
                                <option value="Won">Won</option>
                                <option value="Lost">Lost</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="value">Value ({formData.currency})</Label>
                            <Input
                                id="value"
                                type="number"
                                min="0"
                                value={formData.estimated_value}
                                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                                className={INPUT_CLS}
                            />
                        </div>
                        <div>
                            <Label htmlFor="prob">Probability (%)</Label>
                            <Input
                                id="prob"
                                type="number"
                                min="0"
                                max="100"
                                value={formData.probability}
                                onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                                className={INPUT_CLS}
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="close_date">Expected Close Date</Label>
                        <Input
                            id="close_date"
                            type="date"
                            value={formData.expected_close_date}
                            onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                            className={INPUT_CLS}
                        />
                    </div>

                    <DialogFooter className="flex flex-row justify-between items-center w-full">
                        <div>
                            {initialData?.id && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (confirm("Are you sure you want to delete this deal?")) {
                                            setIsLoading(true)
                                            try {
                                                const res = await fetch(`/api/admin/deals?id=${initialData.id}`, { method: "DELETE" })
                                                if (res.ok) {
                                                    toast.success("Deal deleted successfully")
                                                    onSuccess()
                                                    onOpenChange(false)
                                                } else {
                                                    toast.error("Failed to delete deal")
                                                }
                                            } catch (e) {
                                                console.error(e)
                                                toast.error("Error deleting deal")
                                            } finally {
                                                setIsLoading(false)
                                            }
                                        }
                                    }}
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                            >
                                {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
                                {isLoading ? "Saving..." : initialData?.id ? "Update Deal" : "Create Deal"}
                            </button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
