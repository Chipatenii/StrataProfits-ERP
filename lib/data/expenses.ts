import { createClient } from "@/lib/supabase/server"
import { Expense } from "@/lib/types"

export async function getExpenses(filters?: { status?: string, projectId?: string }) {
    const supabase = await createClient()

    let query = supabase
        .from("expenses")
        .select("*, project:projects(name), client:clients(name), submitted_by:profiles(full_name)")
        .order("created_at", { ascending: false })

    if (filters?.status) {
        query = query.eq("status", filters.status)
    }
    if (filters?.projectId) {
        query = query.eq("project_id", filters.projectId)
    }

    const { data, error } = await query

    if (error) {
        console.error("Error fetching expenses:", error)
        return []
    }

    return data as Expense[]
}
