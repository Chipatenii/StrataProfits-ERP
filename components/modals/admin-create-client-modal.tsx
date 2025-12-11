"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AdminCreateClientModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function AdminCreateClientModal({ open, onOpenChange, onSuccess }: AdminCreateClientModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        business_name: "",
        email: "",
        phone: "",
        location: "",
        type: "mixed",
        value_tier: "Standard",
        status: "Active",
    })
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) return

        setIsLoading(true)

        try {
            const response = await fetch("/api/admin/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (!response.ok) throw new Error("Failed to create client")

            setFormData({
                name: "",
                business_name: "",
                email: "",
                phone: "",
                location: "",
                type: "mixed",
                value_tier: "Standard",
                status: "Active",
            })
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error("Error creating client:", error)
            alert("Failed to create client")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card border-border/30 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-primary">Add New Client</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Client Name *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1 bg-card border-border/30"
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
                            className="mt-1 bg-card border-border/30"
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
                                className="mt-1 bg-card border-border/30"
                            />
                        </div>
                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="mt-1 bg-card border-border/30"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="mt-1 bg-card border-border/30"
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
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
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
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
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
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
                            >
                                <option value="Active">Active</option>
                                <option value="Lead">Lead</option>
                                <option value="Dormant">Dormant</option>
                                <option value="Past">Past</option>
                            </select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save Client"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
