import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { APP_CONFIG } from "@/lib/config/constants"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        if (!['admin', 'book_keeper'].includes(profile?.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // 1. Get Cashflow Summary (from View) - Last 6 months
        const { data: cashflow, error: cfError } = await admin
            .from("cashflow_summary")
            .select("*")
            .limit(APP_CONFIG.REPORTS.FINANCE_HISTORY_LIMIT)

        if (cfError) console.error("Cashflow view error", cfError)

        // 2. Get Project Profitability (from View) - Top 5
        const { data: projectProfit, error: ppError } = await admin
            .from("project_profit_summary")
            .select("*")
            .order("net_profit", { ascending: false })
            .limit(APP_CONFIG.REPORTS.FINANCE_SUMMARY_LIMIT)

        if (ppError) console.error("Profit view error", ppError)

        // 3. Calculate Totals (Mocking YTD logic by summing all for now or improved later)
        // For YTD we might need a separate query or aggregate in JS if dataset is small
        // Let's use simple aggregates from invoices/expenses for YTD

        const currentYear = new Date().getFullYear()
        const startOfYear = `${currentYear}-01-01T00:00:00Z`

        // 1. Revenue
        const { data: revenueData } = await admin.from("payments").select("amount").gte("paid_at", startOfYear)
        const totalRevenue = revenueData?.reduce((sum, p) => sum + p.amount, 0) || 0

        // 2. Expenses (Regular) — filter on paid_at, not updated_at,
        //    to avoid double-counting records touched after their payment date.
        const { data: expenseData } = await admin
            .from("expenses")
            .select("amount")
            .eq("status", "Paid")
            .gte("paid_at", startOfYear)
        let totalExpenses = expenseData?.reduce((sum, e) => sum + e.amount, 0) || 0

        // 3. Payroll (Team Payments)
        const { data: payrollData, error: payrollError } = await admin.from("team_payments").select("amount").gte("payment_date", startOfYear)
        if (payrollError) console.error("Error fetching payroll for YTD", payrollError)
        const totalPayroll = payrollData?.reduce((sum, p) => sum + p.amount, 0) || 0
        
        // Combine expenses and payroll
        totalExpenses += totalPayroll

        const netProfit = totalRevenue - totalExpenses

        return NextResponse.json({
            ytd: {
                revenue: totalRevenue,
                expenses: totalExpenses,
                net_profit: netProfit,
                currency: 'ZMW' // Default
            },
            cashflow: cashflow || [],
            top_projects: projectProfit || []
        })

    } catch (error) {
        console.error("Error fetching finance report:", error)
        return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 })
    }
}
