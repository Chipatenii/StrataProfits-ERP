"use client"

import { useEffect, useState } from "react"
import { Loader2, TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react"

export function FinanceView() {
    const [loading, setLoading] = useState(true)
    const [cashflow, setCashflow] = useState<any[]>([])
    const [profitability, setProfitability] = useState<any[]>([])

    useEffect(() => {
        // In real app, create /api/finance/reports endpoint calling the getCashflowSummary etc
        // mocking strictly for UI structure now as API endpoint for reports isn't explicitly requested in previous step (but getProjectProfit function exists in lib)

        // Simulating loading
        setTimeout(() => setLoading(false), 500)
    }, [])

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-green-600" /></div>
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Financial Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6 rounded-xl border-l-4 border-l-green-500 bg-green-50/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-800 font-medium">Total Revenue (YTD)</p>
                            <h3 className="text-2xl font-bold text-green-900 mt-1">ZMW 124,500</h3>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full text-green-700">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 rounded-xl border-l-4 border-l-red-500 bg-red-50/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-800 font-medium">Expenses (YTD)</p>
                            <h3 className="text-2xl font-bold text-red-900 mt-1">ZMW 42,300</h3>
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
                            <h3 className="text-2xl font-bold text-blue-900 mt-1">ZMW 82,200</h3>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full text-blue-700">
                            <Wallet size={24} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-lg">
                    <h3 className="font-semibold mb-4 text-gray-700">Cashflow (Coming Soon)</h3>
                    <div className="h-48 bg-gray-50 rounded flex items-center justify-center text-muted-foreground text-sm">
                        Chart Placeholder
                    </div>
                </div>

                <div className="glass-card p-6 rounded-lg">
                    <h3 className="font-semibold mb-4 text-gray-700">Top Profitable Projects (Sample)</h3>
                    <div className="space-y-3">
                        {['E-Commerce Redesign', 'Loan App Maintenance', 'Marketing Q3'].map((proj, i) => (
                            <div key={i} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded transition">
                                <span className="font-medium text-gray-700">{proj}</span>
                                <span className="font-bold text-green-600">+ ZMW {15000 - i * 2000}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
