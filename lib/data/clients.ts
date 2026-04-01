import { createClient } from "@/lib/supabase/server"
import { Client } from "@/lib/types"

// Fetch all clients (Admin/VA view) based on RLS
export async function getClients() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name")

    if (error) {
        console.error("Error fetching clients:", error)
        return []
    }

    return data as Client[]
}

export async function getClientById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single()

    if (error) {
        console.error(`Error fetching client ${id}:`, error)
        return null
    }

    return data as Client
}

export async function getClientMetrics() {
    const supabase = await createClient()

    const [{ count: activeProjects }, { count: pendingInvoices }] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("invoices").select("*", { count: "exact", head: true }).in("status", ["draft", "sent", "overdue"]),
    ])

    return {
        activeProjects: activeProjects ?? 0,
        pendingInvoices: pendingInvoices ?? 0,
    }
}
