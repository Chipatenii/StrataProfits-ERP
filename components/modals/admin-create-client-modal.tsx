"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Client } from "@/lib/types"
import { toast } from "sonner"

interface AdminCreateClientModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    client?: Client | null
}

const INPUT_CLS = "mt-1 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
const SELECT_CLS = "mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"

export function AdminCreateClientModal({ open, onOpenChange, onSuccess, client }: AdminCreateClientModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        business_name: "",
        email: "",
        phone: "",
        tpin: "",
        contact_person: "",
        location: "",
        type: "mixed",
        value_tier: "Standard",
        status: "Active",
    })
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (client) {
            setFormData({
                name: client.name || "",
                business_name: client.business_name || "",
                email: client.email || "",
                phone: client.phone || "",
                tpin: client.tpin || "",
                contact_person: client.contact_person || "",
                location: client.location || "",
                type: client.type || "mixed",
                value_tier: client.value_tier || "Standard",
                status: client.status || "Active",
            })
        } else {
            setFormData({
                name: "",
                business_name: "",
                email: "",
                phone: "",
                tpin: "",
                contact_person: "",
                location: "",
                type: "mixed",
                value_tier: "Standard",
                status: "Active",
            })
        }
    }, [client, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) return

        setIsLoading(true)

        try {
            const url = client ? `/api/admin/clients/${client.id}` : "/api/admin/clients"
            const method = client ? "PUT" : "POST"

            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (!response.ok) throw new Error("Failed to save client")

            if (!client) {
                setFormData({
                    name: "",
                    business_name: "",
                    email: "",
                    phone: "",
                    tpin: "",
                    contact_person: "",
                    location: "",
                    type: "mixed",
                    value_tier: "Standard",
                    status: "Active",
                })
            }
            onSuccess()
            onOpenChange(false)
            toast.success(client ? "Client updated successfully" : "Client created successfully")
        } catch (error) {
            console.error("Error saving client:", error)
            toast.error("Failed to save client")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {client ? "Edit Client" : "Add New Client"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Client Name *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={INPUT_CLS}
                            placeholder="e.g. John Doe or Jane Smith"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="business_name">Business Name</Label>
                        <Input
                            id="business_name"
                            value={formData.business_name}
                            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                            className={INPUT_CLS}
                            placeholder="e.g. Acme Corp"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={INPUT_CLS}
                            />
                        </div>
                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className={INPUT_CLS}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="contact_person">Contact Person</Label>
                            <Input
                                id="contact_person"
                                value={formData.contact_person}
                                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                className={INPUT_CLS}
                                placeholder="Key contact name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="tpin">TPIN</Label>
                            <Input
                                id="tpin"
                                value={formData.tpin}
                                onChange={(e) => setFormData({ ...formData, tpin: e.target.value })}
                                className={INPUT_CLS}
                                placeholder="Tax Payer ID"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className={INPUT_CLS}
                            placeholder="City, Country"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="type">Type</Label>
                            <select
                                id="type"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className={SELECT_CLS}
                            >
                                <option value="mixed">Mixed</option>
                                <option value="dev">Dev</option>
                                <option value="design">Design</option>
                                <option value="marketing">Marketing</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="value_tier">Tier</Label>
                            <select
                                id="value_tier"
                                value={formData.value_tier}
                                onChange={(e) => setFormData({ ...formData, value_tier: e.target.value })}
                                className={SELECT_CLS}
                            >
                                <option value="Standard">Standard</option>
                                <option value="Premium">Premium</option>
                                <option value="HighValue">High Value</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className={SELECT_CLS}
                            >
                                <option value="Active">Active</option>
                                <option value="Lead">Lead</option>
                                <option value="Dormant">Dormant</option>
                                <option value="Past">Past</option>
                            </select>
                        </div>
                    </div>

                    <DialogFooter>
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
                            {isLoading ? "Saving..." : client ? "Update Client" : "Save Client"}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
