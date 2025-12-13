import { createClient } from "@/lib/supabase/server"

export async function getProjectProfitability() {
    const supabase = await createClient()

    // Fetch from the view we created in SQL script
    const { data, error } = await supabase
        .from("project_profit_summary")
        .select("*")
        .order("net_profit", { ascending: false }) // Show most profitable first

    if (error) {
        // If view doesn't exist yet or permission denied
        console.error("Error fetching project profit summary:", error)
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
