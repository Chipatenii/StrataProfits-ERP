"use client"

import { useState, useEffect } from "react"
import { Plus, Search, FileText, Edit2 } from "lucide-react"
import { Payment, OrganizationSettings } from "@/lib/types"
import { CreateReceiptModal } from "@/components/modals/create-receipt-modal"
import { Input } from "@/components/ui/input"
import { PDFService } from "@/lib/pdf-service"

export function PaymentsView() {
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    const [showCreateModal, setShowCreateModal] = useState(false)
    const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null)
    const [orgSettings, setOrgSettings] = useState<Partial<OrganizationSettings>>({})

    useEffect(() => {
        fetchPayments()
        fetch("/api/organization").then(r => r.ok ? r.json() : {}).then(setOrgSettings).catch(() => { })
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

    const totalReceived = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0)

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading payments...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Payments</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage received payments and receipts</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" /> Record Payment
                </button>
            </div>

            {/* KPI strip */}
            <div className="grid gap-3 md:grid-cols-2">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Payments received</p>
                    <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{filteredPayments.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total received</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">K{totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                        placeholder="Search by receipt # or reference..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 border-slate-200 dark:border-slate-800"
                    />
                </div>
            </div>

            {/* Payments table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/30 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Receipt #</th>
                                <th className="px-4 py-3 text-left font-medium">Date</th>
                                <th className="px-4 py-3 text-left font-medium">Method</th>
                                <th className="px-4 py-3 text-left font-medium">Reference</th>
                                <th className="px-4 py-3 text-right font-medium">Amount</th>
                                <th className="px-4 py-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredPayments.length > 0 ? (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-slate-400" />
                                                {payment.receipt_number || "N/A"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                            {new Date(payment.paid_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 capitalize text-slate-700 dark:text-slate-300">
                                            {payment.method ? payment.method.replace('_', ' ') : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                            {payment.reference || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                                            {formatCurrency(payment.amount, payment.currency)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => {
                                                        setPaymentToEdit(payment)
                                                        setShowCreateModal(true)
                                                    }}
                                                    className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                                    title="Edit Receipt"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => PDFService.generatePaymentPDF(payment, payment.invoice?.invoice_number ?? 'N/A', payment.invoice?.client?.name ?? 'Customer', orgSettings)}
                                                    className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                                    title="Download Receipt"
                                                >
                                                    <FileText size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
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
