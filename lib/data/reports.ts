
import { createClient } from "@/lib/supabase/server"

export interface DashboardStats {
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    outstandingBalance: number
    overdueCount: number
    activeProjects: number
    pendingApprovals: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const supabase = await createClient()

    // Use views for consistent data
    const [invoiceStats, expenseStats, projectStats, approvalStats] = await Promise.all([
        supabase.from("invoice_totals_and_balances").select("invoice_total, paid_amount, balance, status"),
        supabase.from("expenses").select("amount, status").in("status", ["Approved", "Paid"]),
        supabase.from("projects").select("id").eq("status", "active"),
        supabase.from("approval_requests").select("id").eq("status", "pending"),
    ])

    const invoices = invoiceStats.data || []
    const expenses = expenseStats.data || []
    const projects = projectStats.data || []
    const approvals = approvalStats.data || []

    const totalRevenue = invoices.reduce((sum: number, i: any) => sum + (i.invoice_total || 0), 0)
    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
    const outstandingBalance = invoices.reduce((sum: number, i: any) => sum + (i.balance || 0), 0)
    const overdueCount = invoices.filter((i: any) => i.status === "overdue").length

    return {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        outstandingBalance,
        overdueCount,
        activeProjects: projects.length,
        pendingApprovals: approvals.length,
    }
}

export async function getArAgingBuckets() {
    const supabase = await createClient()
    const { data, error } = await supabase.from("ar_aging_buckets").select("*")
    if (error) {
        console.error("Error fetching AR aging:", error)
        return []
    }
    return data
}

export async function getCashflowSummary() {
    const supabase = await createClient()

    // Fetch from view
    const { data, error } = await supabase
        .from("cashflow_summary")
        .select("*")
        .limit(12) // Last 12 months

    if (error) {
        console.error("Error fetching cashflow summary:", error)
        return []
    }

    return data
}
