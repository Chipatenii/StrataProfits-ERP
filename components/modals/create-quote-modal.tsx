"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Loader2, ArrowUp, ArrowDown } from "lucide-react"
import { Client } from "@/lib/types"

interface CreateQuoteModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

interface LineItem {
    id: string
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
}

export function CreateQuoteModal({ open, onOpenChange, onSuccess }: CreateQuoteModalProps) {
    const [loading, setLoading] = useState(false)
    const [clients, setClients] = useState<Client[]>([])
    const [loadingClients, setLoadingClients] = useState(true)

    // Form State
    const [clientId, setClientId] = useState("")
    const [currency, setCurrency] = useState("ZMW")
    const [quoteNumber, setQuoteNumber] = useState("")
    const [referenceNumber, setReferenceNumber] = useState("")
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0])
    const [expiryDate, setExpiryDate] = useState("")

    // Financials
    const [discountRate, setDiscountRate] = useState(0)
    const [adjustment, setAdjustment] = useState(0)

    // Notes & Terms
    const [customerNotes, setCustomerNotes] = useState("")
    const [terms, setTerms] = useState("")

    const [items, setItems] = useState<LineItem[]>([
        { id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: 0 }
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
        setItems([...items, { id: Math.random().toString(), description: '', quantity: 1, unit_price: 0, tax_rate: 0 }])
    }

    const removeItem = (id: string) => {
        if (items.length === 1) return
        setItems(items.filter(i => i.id !== id))
    }

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return
        if (direction === 'down' && index === items.length - 1) return

        const newItems = [...items]
        const temp = newItems[index]
        if (direction === 'up') {
            newItems[index] = newItems[index - 1]
            newItems[index - 1] = temp
        } else {
            newItems[index] = newItems[index + 1]
            newItems[index + 1] = temp
        }
        setItems(newItems)
    }

    const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
        setItems(items.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value }
            }
            return item
        }))
    }

    // Calculations
    const subTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    const discountAmount = subTotal * (discountRate / 100)
    const taxTotal = items.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * (item.tax_rate / 100)), 0)
    const total = subTotal - discountAmount + taxTotal + adjustment

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clientId) return

        setLoading(true)
        try {
            const payload = {
                client_id: clientId,
                currency,
                quote_number: quoteNumber || undefined,
                reference_number: referenceNumber || undefined,
                valid_until: expiryDate || undefined,
                customer_notes: customerNotes,
                terms: terms,
                discount_rate: discountRate,
                discount_amount: discountAmount,
                adjustment: adjustment,
                items: items.filter(i => i.description.trim() !== "").map(i => ({
                    description: i.description,
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    tax_rate: i.tax_rate,
                    tax_amount: (i.quantity * i.unit_price) * (i.tax_rate / 100)
                }))
            }

            const res = await fetch("/api/quotes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error("Failed to create quote")

            onSuccess()
            onOpenChange(false)
            // Reset form
            setClientId("")
            setItems([{ id: '1', description: '', quantity: 1, unit_price: 0, tax_rate: 0 }])
            setQuoteNumber("")
            setReferenceNumber("")
            setQuoteDate(new Date().toISOString().split('T')[0])
            setExpiryDate("")
            setDiscountRate(0)
            setAdjustment(0)
            setCustomerNotes("")
            setTerms("")
        } catch (error) {
            console.error(error)
            alert("Failed to create quote")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto w-full">
                <DialogHeader>
                    <DialogTitle>Create New Quote</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-2">
                    {/* Header Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="space-y-4">
                            <div>
                                <Label>Customer Name</Label>
                                <select
                                    className="w-full mt-1 px-3 py-2 rounded-md bg-white border border-gray-300 focus:ring-2 focus:ring-purple-500"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    required
                                >
                                    <option value="">Select Customer...</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label>Reference #</Label>
                                <Input
                                    value={referenceNumber}
                                    onChange={(e) => setReferenceNumber(e.target.value)}
                                    placeholder="REF-12345"
                                    className="bg-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Label>Quote #</Label>
                                    <Input
                                        value={quoteNumber}
                                        onChange={(e) => setQuoteNumber(e.target.value)}
                                        placeholder="Auto-generated"
                                        className="bg-white"
                                    />
                                </div>
                                <div className="flex-1">
                                    <Label>Currency</Label>
                                    <select
                                        className="w-full h-10 px-3 py-2 rounded-md bg-white border border-gray-300"
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                    >
                                        <option value="ZMW">ZMW (K)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Label>Quote Date</Label>
                                    <Input
                                        type="date"
                                        value={quoteDate}
                                        onChange={(e) => setQuoteDate(e.target.value)}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="flex-1">
                                    <Label>Expiry Date</Label>
                                    <Input
                                        type="date"
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-xs uppercase text-gray-500 font-semibold px-2">
                            <div className="col-span-1 text-center">Order</div>
                            <div className="col-span-5">Item Details</div>
                            <div className="col-span-2 text-right">Qty</div>
                            <div className="col-span-2 text-right">Rate</div>
                            <div className="col-span-1 text-right">Tax(%)</div>
                            <div className="col-span-1 text-right">Amount</div>
                        </div>

                        {items.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-start py-2 border-b border-gray-100 group hover:bg-gray-50/50 rounded-lg px-2 transition-colors">
                                <div className="col-span-1 flex flex-col items-center gap-1 pt-2">
                                    <button type="button" onClick={() => moveItem(index, 'up')} className="text-gray-400 hover:text-purple-600 disabled:opacity-20" disabled={index === 0}>
                                        <ArrowUp size={14} />
                                    </button>
                                    <button type="button" onClick={() => moveItem(index, 'down')} className="text-gray-400 hover:text-purple-600 disabled:opacity-20" disabled={index === items.length - 1}>
                                        <ArrowDown size={14} />
                                    </button>
                                </div>
                                <div className="col-span-5">
                                    <Textarea
                                        placeholder="Item description"
                                        value={item.description}
                                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                        className="min-h-[2.5rem] resize-none"
                                        rows={2}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        className="text-right"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        className="text-right"
                                        value={item.unit_price}
                                        onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <Input
                                        type="number"
                                        min="0"
                                        className="text-right px-1"
                                        value={item.tax_rate}
                                        onChange={(e) => updateItem(item.id, 'tax_rate', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="col-span-1 pt-2 text-right font-medium text-sm flex justify-between">
                                    <span>{(item.quantity * item.unit_price).toLocaleString()}</span>
                                    <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 ml-2">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-2 text-purple-600 border-purple-200 bg-purple-50/50 hover:bg-purple-50">
                            <Plus className="w-4 h-4 mr-2" /> Add Item
                        </Button>
                    </div>

                    {/* Footer Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        <div className="space-y-4">
                            <div>
                                <Label>Customer Notes</Label>
                                <Textarea
                                    className="mt-1 min-h-[100px]"
                                    placeholder="Notes for the customer..."
                                    value={customerNotes}
                                    onChange={(e) => setCustomerNotes(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Terms & Conditions</Label>
                                <Textarea
                                    className="mt-1 min-h-[100px]"
                                    placeholder="Validity period, payment terms..."
                                    value={terms}
                                    onChange={(e) => setTerms(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Sub Total (Tax Exclusive)</span>
                                <span className="font-medium">{subTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Tax Total</span>
                                <span className="font-medium">{taxTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-gray-600 text-sm">Discount (%)</span>
                                <div className="flex items-center gap-2 max-w-[150px]">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        className="h-8 text-right"
                                        value={discountRate}
                                        onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                                    />
                                    <span className="text-xs text-red-500 w-16 text-right">-{discountAmount.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center gap-4">
                                <span className="text-gray-600 text-sm">Adjustment</span>
                                <Input
                                    type="number"
                                    className="h-8 text-right max-w-[120px]"
                                    value={adjustment}
                                    onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)}
                                />
                            </div>

                            <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                                <span className="font-bold text-lg">Total ({currency})</span>
                                <span className="font-bold text-xl text-purple-700">{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading || !clientId} className="bg-purple-600 hover:bg-purple-700">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Quote
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
