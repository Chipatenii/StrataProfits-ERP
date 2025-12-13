import { createClient } from "@/lib/supabase/server"
import { Quote } from "@/lib/types"

export async function getQuotes(filters?: { status?: string }) {
    const supabase = await createClient()

    let query = supabase
        .from("quotes")
        .select("*, client:clients(name)")
        .order("created_at", { ascending: false })

    if (filters?.status) {
        query = query.eq("status", filters.status)
    }

    const { data, error } = await query

    if (error) {
        console.error("Error fetching quotes:", error)
        return []
    }

    return data as Quote[]
}

export async function getQuoteById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("quotes")
        .select("*, items:quote_items(*), client:clients(*)")
        .eq("id", id)
        .single()

    if (error) {
        console.error(`Error fetching quote ${id}:`, error)
        return null
    }

    return data as Quote
}
