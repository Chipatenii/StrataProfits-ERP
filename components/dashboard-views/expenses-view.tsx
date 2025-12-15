"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Loader2, ArrowDownRight, FileText } from "lucide-react"
import { Expense } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ExpensesView() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        fetchExpenses()
    }, [])

    const fetchExpenses = async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/expenses")
            if (res.ok) {
                const data = await res.json()
                setExpenses(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            console.error("Failed to fetch expenses", error)
        } finally {
            setLoading(false)
        }
    }

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
            case "Paid": return "bg-green-100 text-green-700"
            case "Approved": return "bg-blue-100 text-blue-700"
            case "Rejected": return "bg-red-100 text-red-700"
            default: return "bg-yellow-100 text-yellow-700" // Pending
        }
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
                    <h2 className="text-2xl font-bold tracking-tight">Expenses</h2>
                    <p className="text-muted-foreground">Track company expenses and outgoing payments</p>
                </div>
                <Button className="w-full sm:w-auto gap-2" disabled>
                    <Plus className="w-4 h-4" />
                    Record Expense (Soon)
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg border border-border flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder="Search by category or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Expenses List */}
            <div className="bg-white rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Description</th>
                                <th className="px-4 py-3 text-left font-medium">Category</th>
                                <th className="px-4 py-3 text-left font-medium">Date</th>
                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                <th className="px-4 py-3 text-right font-medium">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredExpenses.length > 0 ? (
                                filteredExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 font-medium">
                                            {expense.description || "No description"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {new Date(expense.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                                                {expense.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-medium text-red-600">
                                            {formatCurrency(expense.amount, expense.currency)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        No expenses found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
