import { createClient } from "@/lib/supabase/server"
import { Payment } from "@/lib/types"

export async function getPayments(filters?: { invoiceId?: string }) {
    const supabase = await createClient()

    let query = supabase
        .from("payments")
        .select("*, invoice:invoices(invoice_number, client:clients(name))")
        .order("paid_at", { ascending: false })

    if (filters?.invoiceId) {
        query = query.eq("invoice_id", filters.invoiceId)
    }

    const { data, error } = await query

    if (error) {
        console.error("Error fetching payments:", error)
        return []
    }

    return data as Payment[]
}
