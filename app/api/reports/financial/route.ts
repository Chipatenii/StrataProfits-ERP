import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/reports/financial — aggregate financial data
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (!profile || !["admin", "book_keeper"].includes(profile.role)) {
            return NextResponse.json({ error: "Access restricted to finance roles" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const reportType = searchParams.get("type") || "all"
        const startDate = searchParams.get("start_date")
        const endDate = searchParams.get("end_date")

        const result: Record<string, any> = {}

        // ── Profit & Loss ───────────────────────────────────────────────
        if (reportType === "all" || reportType === "pnl") {
            let invoiceQuery = supabase.from("invoices").select("amount, status, created_at")
            let expenseQuery = supabase.from("expenses").select("amount, status, created_at")

            if (startDate) {
                invoiceQuery = invoiceQuery.gte("created_at", startDate)
                expenseQuery = expenseQuery.gte("created_at", startDate)
            }
            if (endDate) {
                invoiceQuery = invoiceQuery.lte("created_at", endDate)
                expenseQuery = expenseQuery.lte("created_at", endDate)
            }

            const [{ data: invoices }, { data: expenses }] = await Promise.all([invoiceQuery, expenseQuery])

            const totalRevenue = (invoices || [])
                .filter(i => i.status === "paid")
                .reduce((sum, i) => sum + (i.amount || 0), 0)

            const pendingRevenue = (invoices || [])
                .filter(i => ["sent", "overdue"].includes(i.status))
                .reduce((sum, i) => sum + (i.amount || 0), 0)

            const totalExpenses = (expenses || [])
                .filter(e => e.status === "Approved" || e.status === "Paid")
                .reduce((sum, e) => sum + (e.amount || 0), 0)

            result.pnl = {
                totalRevenue,
                pendingRevenue,
                totalExpenses,
                netProfit: totalRevenue - totalExpenses,
                profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100) : 0,
                invoiceCount: (invoices || []).length,
                expenseCount: (expenses || []).length,
            }
        }

        // ── Aged Receivables ────────────────────────────────────────────
        if (reportType === "all" || reportType === "receivables") {
            const { data: unpaidInvoices } = await supabase
                .from("invoices")
                .select("id, amount, due_date, created_at, invoice_number, client:clients(name)")
                .in("status", ["sent", "overdue"])
                .order("due_date", { ascending: true })

            const now = new Date()
            const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 }
            const bucketItems: Record<string, any[]> = { current: [], days30: [], days60: [], days90: [], over90: [] }

            for (const inv of (unpaidInvoices || [])) {
                const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.created_at)
                const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
                const item = { ...inv, days_overdue: daysOverdue }

                if (daysOverdue <= 0) { buckets.current += inv.amount; bucketItems.current.push(item) }
                else if (daysOverdue <= 30) { buckets.days30 += inv.amount; bucketItems.days30.push(item) }
                else if (daysOverdue <= 60) { buckets.days60 += inv.amount; bucketItems.days60.push(item) }
                else if (daysOverdue <= 90) { buckets.days90 += inv.amount; bucketItems.days90.push(item) }
                else { buckets.over90 += inv.amount; bucketItems.over90.push(item) }
            }

            result.receivables = {
                buckets,
                bucketItems,
                totalOutstanding: Object.values(buckets).reduce((a, b) => a + b, 0),
                totalInvoices: (unpaidInvoices || []).length,
            }
        }

        // ── Revenue by Client ───────────────────────────────────────────
        if (reportType === "all" || reportType === "revenue_by_client") {
            let query = supabase.from("invoices").select("amount, status, client:clients(id, name)")
                .eq("status", "paid")

            if (startDate) query = query.gte("created_at", startDate)
            if (endDate) query = query.lte("created_at", endDate)

            const { data: paidInvoices } = await query

            const clientMap: Record<string, { name: string; total: number; count: number }> = {}
            for (const inv of (paidInvoices || [])) {
                const clientData = inv.client as any
                const clientId = clientData?.id || "unknown"
                const clientName = clientData?.name || "Unknown Client"

                if (!clientMap[clientId]) clientMap[clientId] = { name: clientName, total: 0, count: 0 }
                clientMap[clientId].total += inv.amount || 0
                clientMap[clientId].count += 1
            }

            result.revenueByClient = Object.values(clientMap)
                .sort((a, b) => b.total - a.total)
                .slice(0, 15)
        }

        // ── Expense Breakdown ───────────────────────────────────────────
        if (reportType === "all" || reportType === "expenses") {
            let query = supabase.from("expenses").select("amount, category, status")
                .in("status", ["Approved", "Paid"])

            if (startDate) query = query.gte("created_at", startDate)
            if (endDate) query = query.lte("created_at", endDate)

            const { data: approvedExpenses } = await query

            const categoryMap: Record<string, number> = {}
            let totalExp = 0
            for (const exp of (approvedExpenses || [])) {
                const cat = exp.category || "Other"
                categoryMap[cat] = (categoryMap[cat] || 0) + (exp.amount || 0)
                totalExp += exp.amount || 0
            }

            result.expenseBreakdown = {
                categories: Object.entries(categoryMap)
                    .map(([name, amount]) => ({ name, amount, percentage: totalExp > 0 ? (amount / totalExp * 100) : 0 }))
                    .sort((a, b) => b.amount - a.amount),
                total: totalExp,
            }
        }

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("GET /api/reports/financial error:", error)
        return NextResponse.json({ error: error.message || "Failed to generate financial reports" }, { status: 500 })
    }
}
