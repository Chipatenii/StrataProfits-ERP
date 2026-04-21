"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Plus, FileText, ChevronDown, TrendingUp, TrendingDown, RefreshCcw } from "lucide-react"
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
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading financial data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          {userName?.substring(0, 2).toUpperCase() || "OM"}
        </div>
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Hello, {userRole ? userRole.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "User"}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{userName}</p>
        </div>
      </div>

      {/* Receivables and Payables Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Total Receivables Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">Total Receivables</h3>
            <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          <div className="p-5">
            <p className="text-xs uppercase tracking-wide font-medium text-slate-500 dark:text-slate-400 mb-2">
              Total Unpaid Invoices
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{formatCurrency(summary.totalReceivables)}</p>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-emerald-700 rounded-full transition-all"
                style={{ width: summary.totalReceivables > 0 ? "100%" : "0%" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Current</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(summary.currentReceivables)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wide">Overdue</p>
                <button className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1 hover:text-rose-600 transition-colors mt-0.5">
                  {formatCurrency(summary.overdueReceivables)}
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Total Payables Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">Total Payables</h3>
          </div>
          <div className="p-5">
            <p className="text-xs uppercase tracking-wide font-medium text-slate-500 dark:text-slate-400 mb-2">Total Unpaid Bills</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{formatCurrency(summary.totalPayables)}</p>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-slate-400 dark:bg-slate-600 rounded-full transition-all"
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
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Current</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(summary.currentPayables)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wide">Overdue</p>
                <button className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1 hover:text-rose-600 transition-colors mt-0.5">
                  {formatCurrency(summary.overduePayables)}
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">Cash Flow (Net)</h3>
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
        <div className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.cashflowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Net Cash"]}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#047857"
                    strokeWidth={2}
                    dot={{ fill: "#047857", strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, fill: "#047857" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide font-medium text-slate-500 dark:text-slate-400">Opening Balance ({
                  fiscalYear === 'this-month'
                    ? new Date().toLocaleString('default', { day: '2-digit', month: 'short' })
                    : `01 Jan ${fiscalYear === 'last-year' ? new Date().getFullYear() - 1 : new Date().getFullYear()}`
                })</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(summary.cashStart)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide font-medium text-emerald-700 dark:text-emerald-400">Incoming</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-end gap-1 mt-0.5">
                  {formatCurrency(summary.incoming)}
                  <span className="text-emerald-700 text-sm">+</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide font-medium text-rose-600 dark:text-rose-400">Outgoing</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-end gap-1 mt-0.5">
                  {formatCurrency(summary.outgoing)}
                  <span className="text-rose-600 text-sm">-</span>
                </p>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 text-right">
                <p className="text-xs uppercase tracking-wide font-medium text-slate-500 dark:text-slate-400">Net Cash</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                  {formatCurrency(summary.cashEnd)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Income/Expense and Top Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income and Expense */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">Income and Expense</h3>
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
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Income</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{formatCurrency(summary.incoming)}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-900/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white dark:bg-slate-900 rounded-lg border border-rose-200 dark:border-rose-900/40 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Expense</p>
                  <p className="font-bold text-rose-600 dark:text-rose-400 text-sm">{formatCurrency(summary.outgoing)}</p>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
              <p className="font-medium text-sm text-slate-700 dark:text-slate-300">Net Profit</p>
              <p
                className={`font-bold text-lg ${summary.incoming - summary.outgoing >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
              >
                {formatCurrency(summary.incoming - summary.outgoing)}
              </p>
            </div>
          </div>
        </div>

        {/* Top Expenses */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">Top Expenses</h3>
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
          <div className="p-3">
            {expenses.length > 0 ? (
              <div className="space-y-1">
                {expenses.slice(0, 5).map((expense, idx) => (
                  <div
                    key={expense.id || idx}
                    className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                        {idx + 1}
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                        {expense.category || expense.description || "Expense"}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-rose-600 dark:text-rose-400 shrink-0">{formatCurrency(expense.amount || 0)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <FileText className="w-9 h-9 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No expenses recorded yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">Recent Invoices</h3>
          <button onClick={fetchAllData} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
            <RefreshCcw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {invoices.slice(0, 5).map((inv) => (
            <div key={inv.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2">
                    {inv.invoice_number || "Draft"}
                    <button
                      onClick={() => {
                        setInvoiceToEdit(inv)
                        setIsCreateOpen(true)
                      }}
                      className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                    >
                      Edit
                    </button>
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{inv.client?.name || "Unknown"}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap
                  ${inv.status === "paid"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : inv.status === "overdue"
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                        : inv.status === "sent"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                          : "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                    }`}
                >
                  {inv.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "-"}
                </span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {inv.currency || "ZMW"} {inv.amount?.toLocaleString() || "0"}
                </span>
              </div>
            </div>
          ))}
          {invoices.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
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
            <thead className="bg-slate-50 dark:bg-slate-800/30 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium">Client</th>
                <th className="px-4 py-3 text-left font-medium">Due Date</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.slice(0, 5).map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-emerald-700 dark:text-emerald-400">{inv.invoice_number || "Draft"}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{inv.client?.name || "Unknown"}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 dark:text-white">
                    {inv.currency || "ZMW"} {inv.amount?.toLocaleString() || "0"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
                      ${inv.status === "paid"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : inv.status === "overdue"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                            : inv.status === "sent"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                              : "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
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
                      className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No invoices found. Create your first invoice to get started.
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
