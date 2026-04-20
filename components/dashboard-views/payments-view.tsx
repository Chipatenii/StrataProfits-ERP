"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Loader2, FileText } from "lucide-react"
import { Payment, OrganizationSettings } from "@/lib/types"
import { CreateReceiptModal } from "@/components/modals/create-receipt-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PDFService } from "@/lib/pdf-service"

export function PaymentsView() {
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null)
    const [orgSettings, setOrgSettings] = useState<Partial<OrganizationSettings>>({})

    useEffect(() => {
        fetchPayments()
        fetch("/api/organization").then(r => r.ok ? r.json() : {}).then(setOrgSettings).catch(() => {})
    }, [])

    const fetchPayments = async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/payments")
            if (res.ok) {
                const data = await res.json()
                setPayments(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            console.error("Failed to fetch payments", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredPayments = payments.filter(payment => {
        const term = searchTerm.toLowerCase()
        return (
            payment.receipt_number?.toLowerCase().includes(term) ||
            payment.reference?.toLowerCase().includes(term) ||
            payment.amount.toString().includes(term)
        )
    })

    const formatCurrency = (amount: number, currency: string) => {
        return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-primary w-8 h-8" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
                    <p className="text-muted-foreground">Manage received payments and receipts</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto gap-2">
                    <Plus className="w-4 h-4" />
                    Record Payment
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg border border-border flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder="Search by receipt # or reference..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Payments List */}
            <div className="bg-white rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Receipt #</th>
                                <th className="px-4 py-3 text-left font-medium">Date</th>
                                <th className="px-4 py-3 text-left font-medium">Method</th>
                                <th className="px-4 py-3 text-left font-medium">Reference</th>
                                <th className="px-4 py-3 text-right font-medium">Amount</th>
                                <th className="px-4 py-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredPayments.length > 0 ? (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                            {payment.receipt_number || "N/A"}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {new Date(payment.paid_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 capitalize">
                                            {payment.method ? payment.method.replace('_', ' ') : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {payment.reference || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-medium text-green-600">
                                            {formatCurrency(payment.amount, payment.currency)}
                                        </td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setPaymentToEdit(payment)
                                                    setShowCreateModal(true)
                                                }}
                                                className="p-1.5 hover:bg-slate-100 rounded text-blue-600 transition-colors"
                                                title="Edit Receipt"
                                            >
                                                <Plus size={16} className="rotate-45" /> {/* Use as an edit icon or placeholder */}
                                            </button>
                                            <button
                                                // FIX: use joined invoice number and client name instead of raw UUID slice and hardcoded string
                                                onClick={() => PDFService.generatePaymentPDF(payment, payment.invoice?.invoice_number ?? 'N/A', payment.invoice?.client?.name ?? 'Customer', orgSettings)}
                                                className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                                                title="Download Receipt"
                                            >
                                                <FileText size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        No payments found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateReceiptModal
                open={showCreateModal}
                onOpenChange={(open) => {
                    setShowCreateModal(open)
                    if (!open) setPaymentToEdit(null)
                }}
                onSuccess={fetchPayments}
                initialData={paymentToEdit}
            />
        </div>
    )
}
