"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Plus, FileText, Loader2, ChevronDown, TrendingUp, TrendingDown, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Invoice } from "@/lib/types"
import { CreateInvoiceModal } from "@/components/modals/create-invoice-modal"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface FinanceSummary {
  totalReceivables: number
  currentReceivables: number
  overdueReceivables: number
  totalPayables: number
  currentPayables: number
  overduePayables: number
  cashflowData: { month: string; amount: number }[]
  cashStart: number
  cashEnd: number
  incoming: number
  outgoing: number
}

interface VAFinanceProps {
  userName?: string
  userRole?: string
}

export function VAFinance({ userName, userRole }: VAFinanceProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [fiscalYear, setFiscalYear] = useState("this-month")
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null)

  const fetcher = (url: string) => fetch(url).then(r => r.json())

  const { data: invoices = [], isLoading: loadingInvoices, mutate: mutateInvoices } = useSWR<Invoice[]>("/api/invoices", fetcher)
  const { data: clients = [], mutate: mutateClients } = useSWR<any[]>("/api/admin/clients", fetcher)
  const { data: expenses = [], mutate: mutateExpenses } = useSWR<any[]>("/api/expenses", fetcher)
  const { data: payments = [], mutate: mutatePayments } = useSWR<any[]>("/api/payments", fetcher)

  const loading = loadingInvoices

  const fetchAllData = () => {
      mutateInvoices()
      mutateClients()
      mutateExpenses()
      mutatePayments()
  }

  // Calculate financial summary
  const summary: FinanceSummary = useMemo(() => {
    const now = new Date()

    // Receivables (unpaid invoices)
    const unpaidInvoices = invoices.filter((inv) => inv.status !== "paid")
    const totalReceivables = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
    const overdueInvoices = unpaidInvoices.filter(
      (inv) => inv.due_date && new Date(inv.due_date) < now && inv.status !== "paid",
    )
    const overdueReceivables = overdueInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
    const currentReceivables = totalReceivables - overdueReceivables

    // Payables (unpaid expenses)
    const unpaidExpenses = expenses.filter((exp) => exp.status !== "paid" && exp.status !== "approved")
    const totalPayables = unpaidExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
    const currentPayables = totalPayables
    const overduePayables = 0

    // Cashflow calculation
    const incoming =
      payments.reduce((sum, p) => sum + (p.amount || 0), 0) ||
      invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + (i.amount || 0), 0)

    const outgoing = expenses
      .filter((e) => e.status === "paid" || e.status === "approved")
      .reduce((sum, e) => sum + (e.amount || 0), 0)

    // Generate monthly cashflow data based on ACTUAL payments and expenses
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const year = now.getFullYear()

    const cashflowData = months.map((month, idx) => {
      // Incoming: Sum of payments received in this month
      const monthIncome = payments.filter(p => {
        const d = new Date(p.paid_at || p.created_at)
        return d.getMonth() === idx && d.getFullYear() === year
      }).reduce((sum, p) => sum + (p.amount || 0), 0)

      // Fallback to paid invoices if no payments data
      const monthInvoices = invoices.filter(inv => {
        const d = new Date(inv.created_at) // Approximate if no paid_at
        return d.getMonth() === idx && d.getFullYear() === year && inv.status === 'paid'
      }).reduce((sum, inv) => sum + (inv.amount || 0), 0)

      const actualIncome = monthIncome > 0 ? monthIncome : monthInvoices

      // Outgoing: Sum of expenses in this month
      const monthExpenses = expenses.filter(e => {
        const d = new Date(e.created_at)
        return d.getMonth() === idx && d.getFullYear() === year && (e.status === 'paid' || e.status === 'approved')
      }).reduce((sum, e) => sum + (e.amount || 0), 0)

      return {
        month: `${month}`,
        amount: actualIncome - monthExpenses, // Net Cashflow
      }
    })

    return {
      totalReceivables,
      currentReceivables,
      overdueReceivables,
      totalPayables,
      currentPayables,
      overduePayables,
      cashflowData,
      cashStart: 0,
      cashEnd: incoming - outgoing,
      incoming,
      outgoing,
    }
  }, [invoices, expenses, payments])

  const formatCurrency = (amount: number) => {
    return `K${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-gray-50 min-h-full -m-4 md:-m-6 p-4 md:p-6">

      {/* Header with greeting */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
          {userName?.substring(0, 2).toUpperCase() || "OM"}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Hello, {userRole ? userRole.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "User"}</h1>
          <p className="text-sm text-gray-500">{userName}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Receivables and Payables Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Total Receivables Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Total Receivables</h3>
              <Button onClick={() => setIsCreateOpen(true)} variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 gap-1">
                <Plus className="w-4 h-4" /> New
              </Button>
            </div>
            <div className="p-4">
              <p className="text-sm text-blue-600 mb-2">
                Total Unpaid Invoices {formatCurrency(summary.totalReceivables)}
              </p>
              {/* Progress bar */}
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all"
                  style={{ width: summary.totalReceivables > 0 ? "100%" : "0%" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-cyan-600 uppercase tracking-wide">Current</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.currentReceivables)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-red-500 uppercase tracking-wide">Overdue</p>
                  <button className="text-xl font-bold text-gray-900 flex items-center gap-1 hover:text-red-600 transition-colors">
                    {formatCurrency(summary.overdueReceivables)}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Total Payables Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Total Payables</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-blue-600 mb-2">Total Unpaid Bills {formatCurrency(summary.totalPayables)}</p>
              {/* Progress bar */}
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gray-300 rounded-full transition-all"
                  style={{
                    width:
                      summary.totalPayables > 0
                        ? `${Math.min((summary.totalPayables / (summary.totalReceivables || 1)) * 100, 100)}%`
                        : "0%",
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-cyan-600 uppercase tracking-wide">Current</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.currentPayables)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-red-500 uppercase tracking-wide">Overdue</p>
                  <button className="text-xl font-bold text-gray-900 flex items-center gap-1 hover:text-red-600 transition-colors">
                    {formatCurrency(summary.overduePayables)}
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Flow Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Cash Flow (Net)</h3>
            <Select value={fiscalYear} onValueChange={setFiscalYear}>
              <SelectTrigger className="w-[160px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="this-year">This Fiscal Year</SelectItem>
                <SelectItem value="last-year">Last Fiscal Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <div className="lg:col-span-2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.cashflowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#666" }}
                      tickLine={false}
                      axisLine={{ stroke: "#e0e0e0" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#666" }}
                      tickLine={false}
                      axisLine={{ stroke: "#e0e0e0" }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Net Cash"]}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e0e0e0",
                        borderRadius: "8px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: "#3b82f6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Stats */}
              <div className="space-y-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Opening Balance ({
                    fiscalYear === 'this-month'
                      ? new Date().toLocaleString('default', { day: '2-digit', month: 'short' })
                      : `01 Jan ${fiscalYear === 'last-year' ? new Date().getFullYear() - 1 : new Date().getFullYear()}`
                  })</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.cashStart)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-green-600">Incoming</p>
                  <p className="text-xl font-bold text-gray-900 flex items-center justify-end gap-1">
                    {formatCurrency(summary.incoming)}
                    <span className="text-green-500 text-sm">+</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-red-500">Outgoing</p>
                  <p className="text-xl font-bold text-gray-900 flex items-center justify-end gap-1">
                    {formatCurrency(summary.outgoing)}
                    <span className="text-red-500 text-sm">-</span>
                  </p>
                </div>
                <div className="border-t pt-4 text-right">
                  <p className="text-sm text-blue-600">Net Cash</p>
                  <p className="text-xl font-bold text-gray-900 flex items-center justify-end gap-1">
                    {formatCurrency(summary.cashEnd)}
                    <span className="text-gray-400 text-sm">=</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Income/Expense and Top Expenses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income and Expense */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Income and Expense</h3>
              <Select defaultValue="this-year">
                <SelectTrigger className="w-[140px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-year">This Fiscal Year</SelectItem>
                  <SelectItem value="last-year">Last Fiscal Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Income</p>
                      <p className="font-bold text-green-700">{formatCurrency(summary.incoming)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Expense</p>
                      <p className="font-bold text-red-700">{formatCurrency(summary.outgoing)}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-700">Net Profit</p>
                    <p
                      className={`font-bold text-lg ${summary.incoming - summary.outgoing >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(summary.incoming - summary.outgoing)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Expenses */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Top Expenses</h3>
              <Select defaultValue="this-quarter">
                <SelectTrigger className="w-[130px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-quarter">This Quarter</SelectItem>
                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4">
              {expenses.length > 0 ? (
                <div className="space-y-3">
                  {expenses.slice(0, 5).map((expense, idx) => (
                    <div
                      key={expense.id || idx}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {expense.category || expense.description || "Expense"}
                        </span>
                      </div>
                      <span className="font-semibold text-red-600">{formatCurrency(expense.amount || 0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No expenses recorded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Invoices</h3>
            <Button variant="ghost" size="sm" onClick={fetchAllData} className="gap-1">
              <RefreshCcw className="w-4 h-4" /> Refresh
            </Button>
          </div>
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {invoices.slice(0, 5).map((inv) => (
              <div key={inv.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-blue-600 text-sm flex items-center gap-2">
                      {inv.invoice_number || "Draft"}
                      <button
                        onClick={() => {
                          setInvoiceToEdit(inv)
                          setIsCreateOpen(true)
                        }}
                        className="text-[10px] bg-blue-50 px-1 rounded hover:bg-blue-100"
                      >
                        Edit
                      </button>
                    </p>
                    <p className="text-sm text-gray-700 mt-0.5">{inv.client?.name || "Unknown"}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap
                    ${inv.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : inv.status === "overdue"
                          ? "bg-red-100 text-red-700"
                          : inv.status === "sent"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                  >
                    {inv.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "-"}
                  </span>
                  <span className="font-mono font-medium text-gray-900">
                    {inv.currency || "ZMW"} {inv.amount?.toLocaleString() || "0"}
                  </span>
                </div>
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                No invoices found. Create your first invoice to get started.
              </div>
            )}
          </div>

          <CreateInvoiceModal
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open)
              if (!open) setInvoiceToEdit(null)
            }}
            onSuccess={fetchAllData}
            invoiceToEdit={invoiceToEdit}
          />

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Invoice #</th>
                  <th className="px-4 py-3 text-left font-medium">Client</th>
                  <th className="px-4 py-3 text-left font-medium">Due Date</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-blue-600">{inv.invoice_number || "Draft"}</td>
                    <td className="px-4 py-3 text-gray-700">{inv.client?.name || "Unknown"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {inv.currency || "ZMW"} {inv.amount?.toLocaleString() || "0"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                        ${inv.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : inv.status === "overdue"
                              ? "bg-red-100 text-red-700"
                              : inv.status === "sent"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setInvoiceToEdit(inv)
                          setIsCreateOpen(true)
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No invoices found. Create your first invoice to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
