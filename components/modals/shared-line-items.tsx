import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react"

export interface LineItem {
    id: string
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
}

interface LineItemsTableProps {
    items: LineItem[]
    setItems: (items: LineItem[]) => void
    currency: string
    fmt: (n: number) => string
    defaultTaxRate: number
}

export function LineItemsTable({ items, setItems, currency, fmt, defaultTaxRate }: LineItemsTableProps) {
    const addItem = () => {
        setItems([
            ...items, 
            { id: Math.random().toString(), description: '', quantity: 1, unit_price: 0, tax_rate: defaultTaxRate }
        ])
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
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
    }

    return (
        <div className="mt-3 space-y-3">
            {/* Desktop column headers */}
            <div className="hidden md:grid md:grid-cols-[1fr_80px_96px_64px_40px] gap-2 px-1 text-xs uppercase text-muted-foreground font-semibold">
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Rate</span>
                <span className="text-right">Tax %</span>
                <span />
            </div>

            {items.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-border/60 bg-card/50 p-3 md:p-2 space-y-3 md:space-y-0">
                    {/* Mobile layout */}
                    <div className="md:hidden space-y-2">
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-muted-foreground mt-0.5">Item {index + 1}</span>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => moveItem(index, 'up')} disabled={index === 0}
                                    className="p-2 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30 min-w-[36px] min-h-[36px] flex items-center justify-center">
                                    <ChevronUp size={16} />
                                </button>
                                <button type="button" onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1}
                                    className="p-2 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30 min-w-[36px] min-h-[36px] flex items-center justify-center">
                                    <ChevronDown size={16} />
                                </button>
                                <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1}
                                    className="p-2 rounded-md hover:bg-destructive/10 text-destructive disabled:opacity-30 min-w-[36px] min-h-[36px] flex items-center justify-center">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <Textarea
                            placeholder="Item description *"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            className="resize-none bg-background min-h-[72px]"
                            rows={2}
                        />
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <Label className="text-xs text-muted-foreground">Qty</Label>
                                <Input type="number" min="0" className="mt-1 h-11 text-right bg-background"
                                    value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Rate</Label>
                                <Input type="number" min="0" className="mt-1 h-11 text-right bg-background"
                                    value={item.unit_price} onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Tax %</Label>
                                <Input type="number" min="0" className="mt-1 h-11 text-right bg-background"
                                    value={item.tax_rate} onChange={(e) => updateItem(item.id, 'tax_rate', parseFloat(e.target.value) || 0)} />
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-border/40 text-sm">
                            <span className="text-muted-foreground text-xs">Subtotal</span>
                            <span className="font-semibold">{currency} {fmt(item.quantity * item.unit_price)}</span>
                        </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden md:grid md:grid-cols-[1fr_80px_96px_64px_40px] gap-2 items-start">
                        <Textarea placeholder="Item description" value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            className="resize-none bg-background min-h-[2.5rem]" rows={2} />
                        <Input type="number" min="0" className="text-right bg-background h-10"
                            value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                        <Input type="number" min="0" className="text-right bg-background h-10"
                            value={item.unit_price} onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)} />
                        <Input type="number" min="0" className="text-right bg-background h-10"
                            value={item.tax_rate} onChange={(e) => updateItem(item.id, 'tax_rate', parseFloat(e.target.value) || 0)} />
                        <div className="flex flex-col items-center gap-0.5 pt-0.5">
                            <button type="button" onClick={() => moveItem(index, 'up')} disabled={index === 0}
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-25"><ChevronUp size={14} /></button>
                            <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1}
                                className="p-1.5 rounded hover:bg-destructive/10 text-destructive disabled:opacity-25"><Trash2 size={14} /></button>
                            <button type="button" onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1}
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-25"><ChevronDown size={14} /></button>
                        </div>
                    </div>
                </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addItem}
                className="w-full sm:w-auto border-dashed border-primary/40 text-primary hover:bg-primary/5 gap-1.5">
                <Plus size={15} /> Add Line Item
            </Button>
        </div>
    )
}
