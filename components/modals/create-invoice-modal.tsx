"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { Client } from "@/lib/types"

interface CreateInvoiceModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

interface LineItem {
    id: string
    description: string
    quantity: number
    unit_price: number
}

export function CreateInvoiceModal({ open, onOpenChange, onSuccess }: CreateInvoiceModalProps) {
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<Client[]>([])
    const [loadingClients, setLoadingClients] = useState(true)

    // Form State
    const [clientId, setClientId] = useState("")
    const [currency, setCurrency] = useState("ZMW")
    const [invoiceNumber, setInvoiceNumber] = useState("")
    const [items, setItems] = useState<LineItem[]>([
        { id: '1', description: '', quantity: 1, unit_price: 0 }
    ])

    useEffect(() => {
        if (open) {
            fetchClients()
        }
    }, [open])

    const fetchClients = async () => {
        try {
            const res = await fetch("/api/admin/clients")
            if (res.ok) {
                setClients(await res.json())
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingClients(false)
        }
    }

    const addItem = () => {
        setItems([...items, { id: Math.random().toString(), description: '', quantity: 1, unit_price: 0 }])
    }

    const removeItem = (id: string) => {
        if (items.length === 1) return
        setItems(items.filter(i => i.id !== id))
    }

    const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
        setItems(items.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value }
            }
            return item
        }))
    }

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clientId) return

        setLoading(true)
        try {
            const payload = {
                client_id: clientId,
                currency,
                amount: calculateTotal(),
                invoice_number: invoiceNumber || undefined,
                items: items.filter(i => i.description.trim() !== "").map(i => ({
                    description: i.description,
                    quantity: i.quantity,
                    unit_price: i.unit_price
                }))
            }

            const res = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error("Failed to create invoice")

            onSuccess()
            onOpenChange(false)
            // Reset form
            setClientId("")
            setItems([{ id: '1', description: '', quantity: 1, unit_price: 0 }])
        } catch (error) {
            console.error(error)
            alert("Failed to create invoice")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card">
                <DialogHeader>
                    <DialogTitle>Create New Invoice</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <Label>Client</Label>
                            <select
                                className="w-full mt-1 px-3 py-2 rounded-lg bg-card border border-border"
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                required
                            >
                                <option value="">Select a client...</option>
                                {loadingClients ? (
                                    <option disabled>Loading...</option>
                                ) : (
                                    clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))
                                )}
                            </select>
                        </div>
                        <div>
                            <Label>Currency</Label>
                            <select
                                className="w-full mt-1 px-3 py-2 rounded-lg bg-card border border-border"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                            >
                                <option value="ZMW">ZMW (Kwacha)</option>
                                <option value="USD">USD ($)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="EUR">EUR (€)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <Label>Invoice Number (Optional)</Label>
                        <Input
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            placeholder="Auto-generated if empty"
                            className="bg-card border-border mt-1"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label>Line Items</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                <Plus className="w-3 h-3 mr-1" /> Add Item
                            </Button>
                        </div>

                        <div className="bg-muted/20 p-4 rounded-lg space-y-3">
                            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground mb-2 px-1">
                                <div className="col-span-6">Description</div>
                                <div className="col-span-2 text-right">Qty</div>
                                <div className="col-span-3 text-right">Price</div>
                                <div className="col-span-1"></div>
                            </div>

                            {items.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-center animate-in fade-in slide-in-from-top-1">
                                    <div className="col-span-6">
                                        <Input
                                            placeholder="Item description"
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                            required={index === 0}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="bg-white text-right"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                            className="bg-white text-right"
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors disabled:opacity-50"
                                            disabled={items.length === 1}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-2">
                            <div className="text-right">
                                <span className="text-sm text-muted-foreground mr-4">Total Amount:</span>
                                <span className="text-2xl font-bold">{currency} {calculateTotal().toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading || !clientId}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Invoice
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
