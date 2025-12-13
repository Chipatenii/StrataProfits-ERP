"use client"

import { useState, useEffect } from "react"
import { Plus, Search, FileText, Loader2, ArrowUpRight, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { Invoice } from "@/lib/types"
import { CreateInvoiceModal } from "@/components/modals/create-invoice-modal"
import { InvoiceDetailsModal } from "@/components/modals/invoice-details-modal"

export function InvoicesView() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "sent" | "paid" | "overdue">("all")

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

    useEffect(() => {
        fetchInvoices()
    }, [])

    const fetchInvoices = async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/invoices")
            if (res.ok) {
                const data = await res.json()
                setInvoices(data)
            }
        } catch (error) {
            console.error("Failed to fetch invoices", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch =
            inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.client?.name.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "all" || inv.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case "paid": return "bg-green-100 text-green-700 border-green-200"
            case "sent": return "bg-blue-100 text-blue-700 border-blue-200"
            case "draft": return "bg-gray-100 text-gray-700 border-gray-200"
            case "overdue": return "bg-red-100 text-red-700 border-red-200"
            default: return "bg-gray-100 text-gray-700"
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "paid": return <CheckCircle className="w-3 h-3 mr-1" />
            case "sent": return <ArrowUpRight className="w-3 h-3 mr-1" />
            case "draft": return <FileText className="w-3 h-3 mr-1" />
            case "overdue": return <AlertCircle className="w-3 h-3 mr-1" />
            default: return null
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Invoices</h2>
                    <p className="text-muted-foreground">Manage billing and payments</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Create Invoice
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by number or client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                    {["all", "draft", "sent", "paid", "overdue"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status as any)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border
                                ${statusFilter === status
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : filteredInvoices.length === 0 ? (
                <div className="glass-card p-12 text-center text-muted-foreground rounded-xl border border-dashed border-gray-300">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium text-gray-900">No invoices found</p>
                    <p>Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className="bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Invoice #</th>
                                    <th className="px-6 py-3 font-medium">Client</th>
                                    <th className="px-6 py-3 font-medium">Date</th>
                                    <th className="px-6 py-3 font-medium">Amount</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredInvoices.map((invoice) => (
                                    <tr
                                        key={invoice.id}
                                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedInvoice(invoice)}
                                    >
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {invoice.invoice_number || "Draft"}
                                        </td>
                                        <td className="px-6 py-4">
                                            {invoice.client?.name || "Unknown Client"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(invoice.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium">
                                            {invoice.currency} {invoice.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                                                {getStatusIcon(invoice.status)}
                                                <span className="capitalize">{invoice.status}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                className="text-blue-600 hover:text-blue-800 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals will be placed here */}
            {showCreateModal && (
                <CreateInvoiceModal
                    open={showCreateModal}
                    onOpenChange={setShowCreateModal}
                    onSuccess={fetchInvoices}
                />
            )}

            {selectedInvoice && (
                <InvoiceDetailsModal
                    invoice={selectedInvoice}
                    open={!!selectedInvoice}
                    onOpenChange={(open) => !open && setSelectedInvoice(null)}
                    onUpdate={fetchInvoices}
                />
            )}
        </div>
    )
}
