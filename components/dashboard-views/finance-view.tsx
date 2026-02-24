"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Wallet, FileText, Plus, DollarSign } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Button } from "@/components/ui/button"
import { CreateReceiptModal } from "@/components/modals/create-receipt-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpensesView } from "./expenses-view"

export function FinanceView() {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 p-8 md:p-10 text-white shadow-2xl shadow-emerald-500/30">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-green-200" />
                        <span className="text-sm font-medium text-green-100 uppercase tracking-wider">Financial Management</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Finance</h1>
                    <p className="text-green-100/80 text-lg">Monitor financial health and manage expenses</p>
                </div>
            </div>

            {/* Premium Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 h-auto">
                    <TabsTrigger
                        value="overview"
                        className="px-6 py-3 rounded-xl text-sm font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25"
                    >
                        Overview
                    </TabsTrigger>
                    <TabsTrigger
                        value="expenses"
                        className="px-6 py-3 rounded-xl text-sm font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25"
                    >
                        Expenses
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <FinanceOverview />
                </TabsContent>
                <TabsContent value="expenses" className="space-y-6">
                    <ExpensesView />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function FinanceOverview() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [fiscalYear, setFiscalYear] = useState("this-year")
    const [showReceiptModal, setShowReceiptModal] = useState(false)

    useEffect(() => {
        fetchReport()
    }, [])

    const fetchReport = async () => {
        try {
            const res = await fetch("/api/admin/reports/finance")
            if (res.ok) {
                setData(await res.json())
            }
        } catch (error) {
            console.error("Failed to fetch finance report", error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return `K${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                <p className="text-muted-foreground">Loading financial data...</p>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800">
                <DollarSign className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load financial data</h3>
                <p className="text-muted-foreground">Please try again later</p>
            </div>
        )
    }

    const cashflowData = data.cashflow?.map((item: any) => ({
        month: new Date(item.month).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        amount: item.net_cash
    })) || []

    return (
        <div className="space-y-6">
            {/* Action Header */}
            <div className="flex items-center justify-end">
                <Button onClick={() => setShowReceiptModal(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 rounded-xl px-6">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Receipt
                </Button>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Income Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl text-white shadow-lg shadow-emerald-500/25">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-foreground">
                        {formatCurrency(data.ytd.revenue)}
                    </h3>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center font-medium">
                        <TrendingUp size={12} className="mr-1" />
                        +12.5% vs last year
                    </p>
                </div>

                {/* Expenses Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                        <div className="p-3 bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl text-white shadow-lg shadow-red-500/25">
                            <TrendingDown size={20} />
                        </div>
                    </div>
                    <h3 className="text-3xl font-bold text-foreground">
                        {formatCurrency(data.ytd.expenses)}
                    </h3>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-2 flex items-center font-medium">
                        <TrendingUp size={12} className="mr-1" />
                        +5.2% vs last year
                    </p>
                </div>

                {/* Profit Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl text-white shadow-lg shadow-blue-500/25">
                            <Wallet size={20} />
                        </div>
                    </div>
                    <h3 className={`text-3xl font-bold ${data.ytd.net_profit >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                        {formatCurrency(data.ytd.net_profit)}
                    </h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center font-medium">
                        <TrendingUp size={12} className="mr-1" />
                        YTD Performance
                    </p>
                </div>
            </div>

            {/* Cash Flow Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-foreground">Cash Flow Trends</h3>
                    <Select value={fiscalYear} onValueChange={setFiscalYear}>
                        <SelectTrigger className="w-[180px] rounded-xl border-slate-200 dark:border-slate-700">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="this-year">This Fiscal Year</SelectItem>
                            <SelectItem value="last-year">Last Fiscal Year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="p-6 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cashflowData}>
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
                                    border: "none",
                                    borderRadius: "16px",
                                    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="amount"
                                stroke="#10b981"
                                strokeWidth={3}
                                dot={{ fill: "#10b981", strokeWidth: 2, r: 5 }}
                                activeDot={{ r: 7, fill: "#10b981" }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Profitable Projects */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-bold text-lg text-foreground">Top Profitable Projects</h3>
                    </div>
                    <div className="p-4">
                        <div className="space-y-3">
                            {data.top_projects && data.top_projects.length > 0 ? (
                                data.top_projects.map((proj: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-emerald-500/25">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground">{proj.project_name}</p>
                                                <p className="text-sm text-muted-foreground">{proj.client_name}</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">+ {formatCurrency(Number(proj.net_profit))}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                    <p className="text-muted-foreground">No project data available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* More Insights */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center p-12 text-center">
                    <div>
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <TrendingUp className="w-8 h-8 text-slate-500 dark:text-slate-400" />
                        </div>
                        <h3 className="font-bold text-lg text-foreground mb-2">More Insights Coming Soon</h3>
                        <p className="text-muted-foreground">
                            Additional financial reports and tax summaries will be displayed here.
                        </p>
                    </div>
                </div>
            </div>

            <CreateReceiptModal
                open={showReceiptModal}
                onOpenChange={setShowReceiptModal}
                onSuccess={() => {
                    fetchReport()
                }}
            />
        </div>
    )
}
