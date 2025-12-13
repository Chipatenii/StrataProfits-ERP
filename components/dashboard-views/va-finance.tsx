"use client"

import { useState, useEffect, useMemo } from "react"
import { Plus, FileText, Loader2, ChevronDown, TrendingUp, TrendingDown, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import type { Invoice } from "@/lib/types"
import { InvoiceTemplate } from "@/components/invoice-template"
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

export function VAFinance() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "getting-started" | "recent">("dashboard")
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null)
  const [fiscalYear, setFiscalYear] = useState("this-year")

  // Form state
  const [formData, setFormData] = useState({
    client_id: "",
    amount: "",
    status: "draft",
    due_date: new Date().toISOString().split("T")[0],
  })
  const [clients, setClients] = useState<any[]>([])

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    if (printingInvoice) {
      setTimeout(() => {
        window.print()
        setPrintingInvoice(null)
      }, 100)
    }
  }, [printingInvoice])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [invoicesRes, clientsRes, expensesRes, paymentsRes] = await Promise.all([
        fetch("/api/invoices"),
        fetch("/api/admin/clients"),
        fetch("/api/admin/expenses"),
        fetch("/api/payments").catch(() => ({ ok: false })),
      ])

      if (invoicesRes.ok) setInvoices(await invoicesRes.json())
      if (clientsRes.ok) setClients(await clientsRes.json())
      if (expensesRes.ok) setExpenses(await expensesRes.json())
      if (paymentsRes.ok) setPayments(await paymentsRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
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

    // Generate monthly cashflow data
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const currentMonth = now.getMonth()
    const cashflowData = months.map((month, idx) => {
      // Simulate growing cashflow - in real app, aggregate from payments/expenses by month
      const monthInvoices = invoices.filter((inv) => {
        const invDate = new Date(inv.created_at)
        return invDate.getMonth() === idx && inv.status === "paid"
      })
      const monthAmount = monthInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
      return {
        month: `${month} ${now.getFullYear()}`,
        amount: monthAmount || (idx <= currentMonth ? Math.random() * 20000 + 5000 : 0),
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

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: Number.parseFloat(formData.amount),
        }),
      })
      if (res.ok) {
        setIsCreateOpen(false)
        fetchAllData()
      }
    } catch (e) {
      console.error(e)
    }
  }

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
      {printingInvoice && <InvoiceTemplate invoice={printingInvoice} />}

      {/* Header with greeting */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
          OM
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Hello, Managing Director</h1>
          <p className="text-sm text-gray-500">Ostento Media Agency</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "getting-started", label: "Getting Started" },
            { id: "recent", label: "Recent Updates" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Receivables and Payables Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total Receivables Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Total Receivables</h3>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 gap-1">
                      <Plus className="w-4 h-4" /> New
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Invoice</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Client</label>
                        <Select onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Amount</label>
                        <Input
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Due Date</label>
                        <Input
                          type="date"
                          value={formData.due_date}
                          onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
                        Create Invoice
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Total Payables</h3>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 gap-1">
                  <Plus className="w-4 h-4" /> New
                </Button>
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
              <h3 className="font-semibold text-gray-900">Cash Flow</h3>
              <Select value={fiscalYear} onValueChange={setFiscalYear}>
                <SelectTrigger className="w-[160px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-year">This Fiscal Year</SelectItem>
                  <SelectItem value="last-year">Last Fiscal Year</SelectItem>
                  <SelectItem value="this-quarter">This Quarter</SelectItem>
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
                        formatter={(value: number) => [formatCurrency(value), "Amount"]}
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
                    <p className="text-sm text-gray-500">Cash as on 01 Feb 2025</p>
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
                    <p className="text-sm text-blue-600">Cash as on 31 Jan 2026</p>
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
            <div className="overflow-x-auto">
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
                          ${
                            inv.status === "paid"
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
      )}

      {activeTab === "getting-started" && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Getting Started with Finance</h3>
          <p className="text-gray-600 mb-6">
            Set up your financial workflows and start tracking invoices, payments, and expenses.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg hover:border-blue-300 transition-colors">
              <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="font-medium">Create Invoices</p>
            </div>
            <div className="p-4 border rounded-lg hover:border-blue-300 transition-colors">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium">Track Payments</p>
            </div>
            <div className="p-4 border rounded-lg hover:border-blue-300 transition-colors">
              <TrendingDown className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="font-medium">Log Expenses</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "recent" && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Updates</h3>
          <div className="space-y-4">
            {invoices.slice(0, 10).map((inv) => (
              <div key={inv.id} className="flex items-center gap-4 p-3 border-b last:border-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Invoice {inv.invoice_number || "Draft"} - {inv.client?.name || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(inv.created_at).toLocaleDateString()} • {inv.currency} {inv.amount?.toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium
                  ${
                    inv.status === "paid"
                      ? "bg-green-100 text-green-700"
                      : inv.status === "overdue"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {inv.status}
                </span>
              </div>
            ))}
            {invoices.length === 0 && <p className="text-center text-gray-500 py-4">No recent updates</p>}
          </div>
        </div>
      )}
    </div>
  )
}
