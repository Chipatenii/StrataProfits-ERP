"use client"

import { useEffect, useState } from "react"
import { Loader2, TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react"

export function FinanceView() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)

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

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-green-600" /></div>
    }

    if (!data) {
        return <div className="text-center p-8 text-muted-foreground">Failed to load financial data.</div>
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Financial Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 rounded-xl border-l-4 border-l-green-500 bg-green-50/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-800 font-medium">Total Revenue ({new Date().getFullYear()})</p>
                            <h3 className="text-2xl font-bold text-green-900 mt-1">
                                {data.ytd.currency} {data.ytd.revenue.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full text-green-700">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 rounded-xl border-l-4 border-l-red-500 bg-red-50/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-800 font-medium">Expenses ({new Date().getFullYear()})</p>
                            <h3 className="text-2xl font-bold text-red-900 mt-1">
                                {data.ytd.currency} {data.ytd.expenses.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-red-100 rounded-full text-red-700">
                            <TrendingDown size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 rounded-xl border-l-4 border-l-blue-500 bg-blue-50/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-800 font-medium">Net Profit</p>
                            <h3 className="text-2xl font-bold text-blue-900 mt-1">
                                {data.ytd.currency} {data.ytd.net_profit.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full text-blue-700">
                            <Wallet size={24} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-lg">
                    <h3 className="font-semibold mb-4 text-gray-700">Cashflow (Last 6 Months)</h3>
                    <div className="space-y-3">
                        {data.cashflow && data.cashflow.length > 0 ? (
                            data.cashflow.map((row: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-sm border-b last:border-0 pb-2">
                                    <span className="text-gray-600">{new Date(row.month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                                    <span className={`font-mono font-medium ${row.net_cash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {row.net_cash >= 0 ? '+' : ''}{Number(row.net_cash).toLocaleString()}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-sm">No cashflow data available yet.</p>
                        )}
                    </div>
                </div>

                <div className="glass-card p-6 rounded-lg">
                    <h3 className="font-semibold mb-4 text-gray-700">Top Profitable Projects</h3>
                    <div className="space-y-3">
                        {data.top_projects && data.top_projects.length > 0 ? (
                            data.top_projects.map((proj: any, i: number) => (
                                <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded transition">
                                    <div>
                                        <p className="font-medium text-gray-700">{proj.project_name}</p>
                                        <p className="text-xs text-muted-foreground">{proj.client_name}</p>
                                    </div>
                                    <span className="font-bold text-green-600">+ {Number(proj.net_profit).toLocaleString()}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-sm">No project data available.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
