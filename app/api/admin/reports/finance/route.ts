import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = await createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

    if (!['admin', 'book_keeper'].includes(profile?.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        // 1. Get Cashflow Summary (from View) - Last 6 months
        const { data: cashflow, error: cfError } = await admin
            .from("cashflow_summary")
            .select("*")
            .limit(6)

        if (cfError) console.error("Cashflow view error", cfError)

        // 2. Get Project Profitability (from View) - Top 5
        const { data: projectProfit, error: ppError } = await admin
            .from("project_profit_summary")
            .select("*")
            .order("net_profit", { ascending: false })
            .limit(5)

        if (ppError) console.error("Profit view error", ppError)

        // 3. Calculate Totals (Mocking YTD logic by summing all for now or improved later)
        // For YTD we might need a separate query or aggregate in JS if dataset is small
        // Let's use simple aggregates from invoices/expenses for YTD

        const currentYear = new Date().getFullYear()
        const startOfYear = `${currentYear}-01-01T00:00:00Z`

        const { data: revenueData } = await admin.from("payments").select("amount").gte("paid_at", startOfYear)
        const totalRevenue = revenueData?.reduce((sum, p) => sum + p.amount, 0) || 0

        const { data: expenseData } = await admin.from("expenses").select("amount").eq("status", "Paid").gte("updated_at", startOfYear) // Assuming updated_at as paid date approx
        const totalExpenses = expenseData?.reduce((sum, e) => sum + e.amount, 0) || 0

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
