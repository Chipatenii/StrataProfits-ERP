import { useState, useEffect } from "react"
import { Plus, FileText, Check, Clock, AlertCircle, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Invoice } from "@/lib/types"
import { InvoiceTemplate } from "@/components/invoice-template"

export function VAFinance() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null)

    // Form state (simplified, usually use Zod form)
    const [formData, setFormData] = useState({
        client_id: '',
        amount: '',
        status: 'draft',
        due_date: new Date().toISOString().split('T')[0]
    })
    const [clients, setClients] = useState<any[]>([])

    useEffect(() => {
        fetchInvoices()
        fetchClients()
    }, [])

    useEffect(() => {
        if (printingInvoice) {
            // Slight delay to ensure render
            setTimeout(() => {
                window.print()
                setPrintingInvoice(null)
            }, 100)
        }
    }, [printingInvoice])

    const fetchInvoices = async () => {
        try {
            const res = await fetch('/api/invoices')
            if (res.ok) setInvoices(await res.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const fetchClients = async () => {
        try {
            const res = await fetch('/api/admin/clients') // VA has access now
            if (res.ok) setClients(await res.json())
        } catch (e) { console.error(e) }
    }

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    amount: parseFloat(formData.amount)
                })
            })
            if (res.ok) {
                setIsCreateOpen(false)
                fetchInvoices()
            }
        } catch (e) { console.error(e) }
    }

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await fetch(`/api/invoices?id=${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            })
            if (res.ok) fetchInvoices()
        } catch (e) { console.error(e) }
    }

    return (
        <div className="space-y-6">
            {printingInvoice && <InvoiceTemplate invoice={printingInvoice} />}

            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Finance & Invoices</h2>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" /> New Invoice
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label>Client</label>
                                <Select onValueChange={v => setFormData({ ...formData, client_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                                    <SelectContent>
                                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <label>Amount</label>
                                <Input
                                    type="number"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label>Due Date</label>
                                <Input
                                    type="date"
                                    value={formData.due_date}
                                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                />
                            </div>
                            <Button onClick={handleCreate}>Create Invoice</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4">
                {invoices.map(inv => (
                    <div key={inv.id} className="glass-card p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded bg-green-100 flex items-center justify-center text-green-700">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold">{inv.client?.name || 'Unknown Client'}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {inv.invoice_number ? `#${inv.invoice_number} • ` : ''}
                                    Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                            <div className="text-right">
                                <div className="font-bold text-lg">{inv.currency} {inv.amount.toLocaleString()}</div>
                                <div className={`text-xs font-medium uppercase px-2 py-0.5 rounded-full inline-block mt-1
                                    ${inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                                        inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {inv.status}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setPrintingInvoice(inv)}
                                    title="Print Invoice"
                                >
                                    <Printer className="w-4 h-4" />
                                </Button>
                                {inv.status !== 'paid' && (
                                    <Select onValueChange={(v) => updateStatus(inv.id, v)} value={inv.status}>
                                        <SelectTrigger className="w-[100px] h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="sent">Sent</SelectItem>
                                            <SelectItem value="paid">Paid</SelectItem>
                                            <SelectItem value="overdue">Overdue</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {invoices.length === 0 && !loading && (
                    <p className="text-muted-foreground text-center py-8">No invoices found.</p>
                )}
            </div>
        </div>
    )
}
