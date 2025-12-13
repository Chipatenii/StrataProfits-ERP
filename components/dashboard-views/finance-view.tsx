"use client"

import { useEffect, useState } from "react"
import { Loader2, TrendingUp, TrendingDown, Wallet, FileText, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Button } from "@/components/ui/button"
import { CreateReceiptModal } from "@/components/modals/create-receipt-modal"

export function FinanceView() {
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
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
            </div>
        )
    }

    if (!data) {
        return <div className="text-center p-8 text-muted-foreground">Failed to load financial data.</div>
    }

    // Transform API cashflow data for Recharts if needed
    // Assuming API returns [{ month: '2025-01', net_cash: 1000 }]
    const cashflowData = data.cashflow?.map((item: any) => ({
        month: new Date(item.month).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        amount: item.net_cash
    })) || []


    // ... (fetchReport logic stays same)

    return (
        <div className="space-y-6 bg-gray-50 min-h-full -m-4 md:-m-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        AD
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Financial Overview</h1>
                        <p className="text-sm text-gray-500">Ostento Admin</p>
                    </div>
                </div>
                <Button onClick={() => setShowReceiptModal(true)} className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Receipt
                </Button>
            </div>

            {/* Cards and Charts Section (same as before) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Income Card */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                        <div className="p-2 bg-green-100 rounded-full text-green-600">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                        {formatCurrency(data.ytd.revenue)}
                    </h3>
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                        <TrendingUp size={12} className="mr-1" />
                        +12.5% vs last year
                    </p>
                </div>

                {/* Expenses Card */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                        <div className="p-2 bg-red-100 rounded-full text-red-600">
                            <TrendingDown size={20} />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                        {formatCurrency(data.ytd.expenses)}
                    </h3>
                    <p className="text-xs text-red-600 mt-1 flex items-center">
                        <TrendingUp size={12} className="mr-1" />
                        +5.2% vs last year
                    </p>
                </div>

                {/* Profit Card */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-gray-500">Net Profit</p>
                        <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                            <Wallet size={20} />
                        </div>
                    </div>
                    <h3 className={`text-2xl font-bold ${data.ytd.net_profit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {formatCurrency(data.ytd.net_profit)}
                    </h3>
                    <p className="text-xs text-blue-600 mt-1 flex items-center">
                        <TrendingUp size={12} className="mr-1" />
                        YTD Performance
                    </p>
                </div>
            </div>

            {/* Cash Flow Chart */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Cash Flow Trends</h3>
                    <Select value={fiscalYear} onValueChange={setFiscalYear}>
                        <SelectTrigger className="w-[160px] h-8 text-sm">
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Profitable Projects */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Top Profitable Projects</h3>
                    </div>
                    <div className="p-4">
                        <div className="space-y-3">
                            {data.top_projects && data.top_projects.length > 0 ? (
                                data.top_projects.map((proj: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{proj.project_name}</p>
                                                <p className="text-xs text-gray-500">{proj.client_name}</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-green-600 text-sm">+ {formatCurrency(Number(proj.net_profit))}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No project data available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Placeholder for other admin metrics */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center p-8 text-center">
                    <div>
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <TrendingUp className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="font-medium text-gray-900">More Insights Coming Soon</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Additional financial reports and tax summaries will be displayed here.
                        </p>
                    </div>
                </div>
            </div>

            <CreateReceiptModal
                open={showReceiptModal}
                onOpenChange={setShowReceiptModal}
                onSuccess={() => {
                    fetchReport() // Refresh data
                }}
            />
        </div>
    )
}
