"use client"

import { useState } from "react"
import useSWR from "swr"
import { TrendingUp, TrendingDown, Wallet, FileText, Plus, DollarSign } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { CreateReceiptModal } from "@/components/modals/create-receipt-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpensesView } from "./expenses-view"

export function FinanceView() {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div>
                <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Finance</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monitor financial health and manage expenses.</p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-5">
                <TabsList className="bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 h-auto inline-flex">
                    <TabsTrigger
                        value="overview"
                        className="px-4 py-1.5 rounded-md text-sm font-medium data-[state=active]:bg-emerald-700 data-[state=active]:text-white"
                    >
                        Overview
                    </TabsTrigger>
                    <TabsTrigger
                        value="expenses"
                        className="px-4 py-1.5 rounded-md text-sm font-medium data-[state=active]:bg-emerald-700 data-[state=active]:text-white"
                    >
                        Expenses
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-5 mt-5">
                    <FinanceOverview />
                </TabsContent>
                <TabsContent value="expenses" className="space-y-5 mt-5">
                    <ExpensesView />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function FinanceOverview() {
    const [fiscalYear, setFiscalYear] = useState("this-year")
    const [showReceiptModal, setShowReceiptModal] = useState(false)

    const fetcher = (url: string) => fetch(url).then(res => res.json())
    const { data: data, isLoading: loading, mutate: fetchReport } = useSWR("/api/admin/reports/finance", fetcher)

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

    if (!data) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800">
                <DollarSign className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Failed to load financial data</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Please try again later.</p>
            </div>
        )
    }

    const cashflowData = data.cashflow?.map((item: { month: string, net_cash: number }) => ({
        month: new Date(item.month).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        amount: item.net_cash
    })) || []

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-end">
                <button
                    onClick={() => setShowReceiptModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors font-semibold text-sm shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Create receipt
                </button>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    label="Total revenue"
                    value={formatCurrency(data.ytd.revenue)}
                    icon={<TrendingUp className="w-5 h-5" />}
                    iconBg="bg-emerald-700"
                    footer={<><TrendingUp size={12} className="text-emerald-600 dark:text-emerald-400" /><span className="text-emerald-600 dark:text-emerald-400 font-medium">+12.5% vs last year</span></>}
                />
                <StatCard
                    label="Total expenses"
                    value={formatCurrency(data.ytd.expenses)}
                    icon={<TrendingDown className="w-5 h-5" />}
                    iconBg="bg-red-600"
                    footer={<><TrendingUp size={12} className="text-red-600 dark:text-red-400" /><span className="text-red-600 dark:text-red-400 font-medium">+5.2% vs last year</span></>}
                />
                <StatCard
                    label="Net profit"
                    value={formatCurrency(data.ytd.net_profit)}
                    valueClass={data.ytd.net_profit >= 0 ? "text-slate-900 dark:text-white" : "text-red-600"}
                    icon={<Wallet className="w-5 h-5" />}
                    iconBg="bg-blue-600"
                    footer={<><TrendingUp size={12} className="text-blue-600 dark:text-blue-400" /><span className="text-blue-600 dark:text-blue-400 font-medium">YTD performance</span></>}
                />
            </div>

            {/* Cash flow chart */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-semibold text-base text-slate-900 dark:text-white">Cash flow trends</h3>
                    <Select value={fiscalYear} onValueChange={setFiscalYear}>
                        <SelectTrigger className="w-[180px] rounded-lg border-slate-200 dark:border-slate-700">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="this-year">This fiscal year</SelectItem>
                            <SelectItem value="last-year">Last fiscal year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="p-5 h-72">
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
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                    fontSize: "13px",
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="amount"
                                stroke="#047857"
                                strokeWidth={2}
                                dot={{ fill: "#047857", strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, fill: "#047857" }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top profitable projects */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-semibold text-base text-slate-900 dark:text-white">Top profitable projects</h3>
                    </div>
                    <div className="p-3">
                        <div className="space-y-2">
                            {data.top_projects && data.top_projects.length > 0 ? (
                                data.top_projects.map((proj: { client_name: string, project_name: string, net_profit: number }, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-md flex items-center justify-center text-sm font-bold">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-slate-900 dark:text-white">{proj.project_name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{proj.client_name}</p>
                                            </div>
                                        </div>
                                        <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">+{formatCurrency(Number(proj.net_profit))}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400">No project data available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* More insights */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-10 text-center">
                    <div>
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <TrendingUp className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                        </div>
                        <h3 className="font-semibold text-base text-slate-900 dark:text-white mb-1">More insights coming soon</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Additional financial reports and tax summaries will be displayed here.
                        </p>
                    </div>
                </div>
            </div>

            <CreateReceiptModal
                open={showReceiptModal}
                onOpenChange={setShowReceiptModal}
                onSuccess={() => fetchReport()}
            />
        </div>
    )
}

function StatCard({
    label,
    value,
    valueClass,
    icon,
    iconBg,
    footer,
}: {
    label: string
    value: string
    valueClass?: string
    icon: React.ReactNode
    iconBg: string
    footer: React.ReactNode
}) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white ${iconBg}`}>
                    {icon}
                </div>
            </div>
            <h3 className={`text-2xl font-bold ${valueClass || "text-slate-900 dark:text-white"}`}>{value}</h3>
            <div className="text-xs mt-2 flex items-center gap-1">{footer}</div>
        </div>
    )
}
