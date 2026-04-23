import { createClient } from "@/lib/supabase/server"
import { Invoice } from "@/lib/types"

export async function getInvoices(filters?: { status?: string, projectId?: string }) {
    const supabase = await createClient()

    let query = supabase
        .from("invoices")
        .select("*, client:clients(name), project:projects(name)")
        .order("created_at", { ascending: false })

    if (filters?.status) {
        query = query.eq("status", filters.status)
    }
    if (filters?.projectId) {
        query = query.eq("project_id", filters.projectId)
    }

    const { data, error } = await query

    if (error) {
        console.error("Error fetching invoices:", error)
        return []
    }

    return data as Invoice[]
}

export async function getInvoiceById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("invoices")
        .select("*, items:invoice_items(*), payments:payments(*), client:clients(*), project:projects(*)")
        .eq("id", id)
        .single()

    if (error) {
        console.error(`Error fetching invoice ${id}:`, error)
        return null
    }

    return data as Invoice
}

/**
 * Compute the outstanding balance for an invoice.
 *
 * The canonical total is the sum of `invoice_items.total` columns.  If an
 * invoice was created before line items existed (legacy) we fall back to the
 * `invoices.amount` header column.  This mirrors the logic used by
 * `reevaluateInvoiceStatus` in /api/payments so both always agree.
 */
export async function getOutstandingBalance(invoiceId: string) {
    const invoice = await getInvoiceById(invoiceId)
    if (!invoice) return 0

    const total = computeInvoiceTotal(invoice)
    const paid = invoice.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0

    return total - paid
}

/**
 * Shared helper: derive the canonical invoice total from line items when
 * available, otherwise fall back to the header `amount` field.
 *
 * Exported so that /api/payments can import and reuse the same logic.
 */
export function computeInvoiceTotal(invoice: Invoice): number {
    const itemsTotal = invoice.items?.reduce((sum, item) => sum + (item.total || 0), 0) ?? 0
    return itemsTotal > 0 ? itemsTotal : (invoice.amount ?? 0)
}
