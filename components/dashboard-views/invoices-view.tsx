"use client"

import { useState } from "react"
import useSWR from "swr"
import { Plus, Search, FileText, ArrowUpRight, CheckCircle, AlertCircle, Trash2 } from "lucide-react"
import { Invoice, OrganizationSettings } from "@/lib/types"
import { CreateInvoiceModal } from "@/components/modals/create-invoice-modal"
import { InvoiceDetailsModal } from "@/components/modals/invoice-details-modal"
import { PDFService } from "@/lib/pdf-service"

export function InvoicesView() {
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "sent" | "paid" | "overdue">("all")

    const [showCreateModal, setShowCreateModal] = useState(false)
    const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null)
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

    const fetcher = (url: string) => fetch(url).then(res => res.json());
    const { data: invoices = [], isLoading: loading, mutate: fetchInvoices } = useSWR<Invoice[]>("/api/invoices", fetcher)
    const { data: orgSettings = {} } = useSWR<Partial<OrganizationSettings>>("/api/organization", (url: string) => fetch(url).then(r => r.ok ? r.json() : {}))

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch =
            inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.client?.name.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "all" || inv.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case "paid": return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
            case "sent": return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
            case "draft": return "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
            case "overdue": return "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
            default: return "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
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

    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
    const paidAmount = filteredInvoices.filter(i => i.status === "paid").reduce((sum, inv) => sum + (inv.amount || 0), 0)
    const overdueAmount = filteredInvoices.filter(i => i.status === "overdue").reduce((sum, inv) => sum + (inv.amount || 0), 0)

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Invoices</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage billing and payments</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" /> Create Invoice
                </button>
            </div>

            {/* KPI strip */}
            <div className="grid gap-3 md:grid-cols-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Invoices</p>
                    <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{filteredInvoices.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total value</p>
                    <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">K{totalAmount.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Paid</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">K{paidAmount.toLocaleString()}</p>
                </div>
                <div className={`p-4 rounded-xl border ${overdueAmount > 0 ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Overdue</p>
                    <p className={`text-2xl font-bold mt-1 ${overdueAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>K{overdueAmount.toLocaleString()}</p>
                </div>
            </div>

            {/* Search + filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by number or client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        {["all", "draft", "sent", "paid", "overdue"].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status as any)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors border
                                    ${statusFilter === status
                                        ? "bg-emerald-700 text-white border-emerald-700"
                                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:text-emerald-700"}`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading invoices...</p>
                </div>
            ) : filteredInvoices.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="text-base font-semibold text-slate-900 dark:text-white">No invoices found</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredInvoices.map((invoice) => (
                            <div
                                key={invoice.id}
                                className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                                onClick={() => setSelectedInvoice(invoice)}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white text-sm">
                                            {invoice.invoice_number || "Draft"}
                                        </p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                            {invoice.client?.name || "Unknown Client"}
                                        </p>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${getStatusColor(invoice.status)}`}>
                                        {getStatusIcon(invoice.status)}
                                        <span className="capitalize">{invoice.status}</span>
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {new Date(invoice.created_at).toLocaleDateString()}
                                    </span>
                                    <span className="font-mono font-medium text-slate-900 dark:text-white">
                                        {invoice.currency} {invoice.amount.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            PDFService.generateInvoicePDF(invoice, orgSettings)
                                        }}
                                        className="text-xs flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium hover:underline"
                                    >
                                        <FileText size={14} /> Download PDF
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide bg-slate-50 dark:bg-slate-800/30">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Invoice #</th>
                                    <th className="px-6 py-3 font-medium">Client</th>
                                    <th className="px-6 py-3 font-medium">Date</th>
                                    <th className="px-6 py-3 font-medium">Amount</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredInvoices.map((invoice) => (
                                    <tr
                                        key={invoice.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedInvoice(invoice)}
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                            {invoice.invoice_number || "Draft"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                            {invoice.client?.name || "Unknown Client"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                            {new Date(invoice.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-slate-900 dark:text-white">
                                            {invoice.currency} {invoice.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${getStatusColor(invoice.status)}`}>
                                                {getStatusIcon(invoice.status)}
                                                <span className="capitalize">{invoice.status}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setInvoiceToEdit(invoice)
                                                        setShowCreateModal(true)
                                                    }}
                                                    className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                                    title="Edit Invoice"
                                                >
                                                    <FileText size={14} />
                                                </button>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation()
                                                        if (confirm("Are you sure you want to delete this invoice?")) {
                                                            try {
                                                                const res = await fetch(`/api/invoices?id=${invoice.id}`, { method: "DELETE" })
                                                                if (res.ok) fetchInvoices()
                                                                else alert("Failed to delete invoice")
                                                            } catch (err) { console.error(err) }
                                                        }
                                                    }}
                                                    className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                                    title="Delete Invoice"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showCreateModal && (
                <CreateInvoiceModal
                    open={showCreateModal}
                    onOpenChange={(open) => {
                        setShowCreateModal(open)
                        if (!open) setInvoiceToEdit(null)
                    }}
                    onSuccess={fetchInvoices}
                    invoiceToEdit={invoiceToEdit}
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
