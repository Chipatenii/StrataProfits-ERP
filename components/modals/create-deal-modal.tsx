"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Client } from "@/lib/types"

interface CreateDealModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    initialData?: any
}

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
    const [clients, setClients] = useState<Client[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (open) {
            fetchClients() // Reuse client fetch
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

    const fetchClients = async () => {
        try {
            const res = await fetch("/api/admin/clients")
            if (res.ok) setClients(await res.json())
        } catch (error) {
            console.warn("Failed to load clients for deal modal:", error)
        }
    }

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
                throw new Error(err.error || `Failed to ${initialData?.id ? 'update' : 'create'} deal`)
            }

            setFormData({
                title: "", client_id: "", stage: "NewLead", estimated_value: "0", currency: "ZMW", probability: "20", expected_close_date: ""
            })
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error(`Error ${initialData?.id ? 'updating' : 'creating'} deal:`, error)
            alert(`Failed to ${initialData?.id ? 'update' : 'create'} deal`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card border-border/30 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-primary">{initialData?.id ? 'Edit Deal' : 'New Deal'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="title">Deal Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="mt-1 bg-card border-border/30"
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
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
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
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
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
                                className="mt-1 bg-card border-border/30"
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
                                className="mt-1 bg-card border-border/30"
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
                            className="mt-1 bg-card border-border/30"
                        />
                    </div>

                    <DialogFooter className="flex flex-row justify-between items-center w-full">
                        <div>
                            {initialData?.id && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-0"
                                    onClick={async () => {
                                        if (confirm("Are you sure you want to delete this deal?")) {
                                            setIsLoading(true)
                                            try {
                                                const res = await fetch(`/api/admin/deals?id=${initialData.id}`, { method: "DELETE" })
                                                if (res.ok) {
                                                    onSuccess()
                                                    onOpenChange(false)
                                                } else {
                                                    alert("Failed to delete deal")
                                                }
                                            } catch (e) { console.error(e) }
                                            finally { setIsLoading(false) }
                                        }
                                    }}
                                >
                                    Delete
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Saving..." : initialData?.id ? "Update Deal" : "Create Deal"}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
