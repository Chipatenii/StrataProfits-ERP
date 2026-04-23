"use client"

import { useState } from "react"
import useSWR from "swr"
import { Plus, Search, Edit2 } from "lucide-react"
import { Expense } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { CreateExpenseModal } from "@/components/modals/create-expense-modal"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function ExpensesView() {
    const [searchTerm, setSearchTerm] = useState("")
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null)

    const { data, isLoading: loading, mutate: refetch } = useSWR<Expense[]>("/api/expenses", fetcher)
    const expenses = Array.isArray(data) ? data : []

    const filteredExpenses = expenses.filter(expense => {
        const term = searchTerm.toLowerCase()
        return (
            expense.description?.toLowerCase().includes(term) ||
            expense.category.toLowerCase().includes(term) ||
            expense.amount.toString().includes(term)
        )
    })

    const formatCurrency = (amount: number, currency: string) => {
        return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Paid": return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            case "Approved": return "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
            case "Rejected": return "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
            default: return "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading expenses...</p>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Expenses</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Track company expenses and outgoing payments.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors font-semibold text-sm shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Record expense
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                        placeholder="Search by category or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Expenses list */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Description</th>
                                <th className="px-4 py-3 text-left font-medium">Category</th>
                                <th className="px-4 py-3 text-left font-medium">Date</th>
                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                <th className="px-4 py-3 text-right font-medium">Amount</th>
                                <th className="px-4 py-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredExpenses.length > 0 ? (
                                filteredExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                            {expense.description || "No description"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                            {new Date(expense.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${getStatusColor(expense.status)}`}>
                                                {expense.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                                            {formatCurrency(expense.amount, expense.currency)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => {
                                                    setExpenseToEdit(expense)
                                                    setShowCreateModal(true)
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md transition-colors"
                                                title="Edit expense"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                        No expenses found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateExpenseModal
                open={showCreateModal}
                onOpenChange={(open) => {
                    setShowCreateModal(open)
                    if (!open) setExpenseToEdit(null)
                }}
                onSuccess={() => refetch()}
                initialData={expenseToEdit}
            />
        </div>
    )
}
