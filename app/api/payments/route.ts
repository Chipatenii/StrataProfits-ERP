import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { generateDocumentNumber } from "@/lib/utils/document-numbers"
import { postPayment, reverseEntry } from "@/lib/ledger/post"

export const dynamic = 'force-dynamic'

const createPaymentSchema = z.object({
    invoice_id: z.string().uuid(),
    amount: z.number().positive(),
    currency: z.string().default('ZMW'),
    method: z.enum(['cash', 'bank_transfer', 'mobile_money', 'card', 'other']),
    reference: z.string().optional(),
    receipt_number: z.string().optional()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive the canonical invoice total.
 *
 * Prefers the sum of `invoice_items.total` values (written on every new item
 * insert) over the header `amount` column so that both the overpayment guard
 * and `reevaluateInvoiceStatus` always use the same figure.
 */
function resolveInvoiceTotal(
    invoiceAmount: number,
    items: { total: number }[] | null | undefined
): number {
    const itemsTotal = (items ?? []).reduce((s, i) => s + (i.total || 0), 0)
    return itemsTotal > 0 ? itemsTotal : (invoiceAmount ?? 0)
}

async function reevaluateInvoiceStatus(admin: any, invoiceId: string) {
    // Fetch both header amount AND line items so we use the same logic as
    // getOutstandingBalance in lib/data/invoices.ts.
    const { data: invoice } = await admin
        .from("invoices")
        .select("amount, invoice_items(total)")
        .eq("id", invoiceId)
        .single()

    const { data: payments } = await admin
        .from("payments")
        .select("amount")
        .eq("invoice_id", invoiceId)

    if (invoice && payments) {
        const totalDue = resolveInvoiceTotal(invoice.amount, invoice.invoice_items)
        const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0)
        const newStatus = totalPaid >= totalDue ? 'paid' : totalPaid > 0 ? 'sent' : 'draft'
        await admin.from("invoices").update({ status: newStatus }).eq("id", invoiceId)
    }
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        if (!['admin', 'book_keeper', 'virtual_assistant'].includes(profile?.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        // FIX: join invoice and client so the view can render real invoice number and customer name in the PDF
        const { data: payments, error } = await admin
            .from("payments")
            .select("*, invoice:invoices(invoice_number, client:clients(name))")
            .order("paid_at", { ascending: false })

        if (error) throw error

        return NextResponse.json(payments)
    } catch (error) {
        console.error("Error fetching payments:", error)
        return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
    }
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        // Check Role: Only Admin or Bookkeeper can record funds
        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        if (!['admin', 'book_keeper'].includes(profile?.role)) {
            return NextResponse.json({ error: "Forbidden: Only Admin/Bookkeeper can record payments" }, { status: 403 })
        }

        const body = await request.json()
        const validation = createPaymentSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 })
        }

        const { invoice_id, amount } = validation.data

        // 0. Prevent Overpayments — use the canonical total (items > header fallback)
        const { data: invoice } = await admin
            .from("invoices")
            .select("amount, invoice_number, client_id, project_id, invoice_items(total)")
            .eq("id", invoice_id)
            .single()
        if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

        const { data: existingPayments } = await admin.from("payments").select("amount").eq("invoice_id", invoice_id)
        const totalPaid = (existingPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0)
        const invoiceTotal = resolveInvoiceTotal(invoice.amount, invoice.invoice_items)
        const balanceDue = invoiceTotal - totalPaid

        if (amount > balanceDue) {
            return NextResponse.json({ error: "Unprocessable Entity", details: "Payment amount exceeds balance due" }, { status: 422 })
        }

        // Auto-generate receipt number if not supplied
        const paymentData = { ...validation.data }
        if (!paymentData.receipt_number) {
            paymentData.receipt_number = await generateDocumentNumber(admin, 'payments', 'RCT')
        }

        // 1. Record Payment
        const { data: payment, error } = await admin.from("payments").insert({
            ...paymentData,
            received_by_user_id: user.id
        }).select().single()

        if (error) throw error

        // 2. Post to General Ledger (cash-basis: Dr Cash/Bank, Cr Revenue)
        try {
            await postPayment(admin, payment, {
                invoice_number: invoice.invoice_number,
                client_id: invoice.client_id,
                project_id: invoice.project_id,
            })
        } catch (ledgerErr) {
            console.error("Ledger posting failed for payment:", payment.id, ledgerErr)
        }

        // 3. Update Invoice Status
        await reevaluateInvoiceStatus(admin, invoice_id)

        return NextResponse.json(payment)

    } catch (error) {
        console.error("Error creating payment:", error)
        return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
    }
}

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        if (!['admin', 'book_keeper'].includes(profile?.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

        const body = await request.json()
        const validation = createPaymentSchema.partial().safeParse(body)
        if (!validation.success) {
            return NextResponse.json({ error: "Validation failed" }, { status: 400 })
        }

        // Overpayment guard: if the amount is being changed we must re-check the balance.
        if (validation.data.amount !== undefined) {
            const { data: currentPayment } = await admin
                .from("payments")
                .select("invoice_id, amount")
                .eq("id", id)
                .single()

            if (!currentPayment) {
                return NextResponse.json({ error: "Payment not found" }, { status: 404 })
            }

            const invoiceId = validation.data.invoice_id ?? currentPayment.invoice_id
            const { data: invoice } = await admin
                .from("invoices")
                .select("amount, invoice_items(total)")
                .eq("id", invoiceId)
                .single()

            if (invoice) {
                const { data: allPayments } = await admin
                    .from("payments")
                    .select("amount")
                    .eq("invoice_id", invoiceId)
                    .neq("id", id) // exclude current payment from the sum

                const otherPaid = (allPayments ?? []).reduce((s: number, p: any) => s + p.amount, 0)
                const invoiceTotal = resolveInvoiceTotal(invoice.amount, invoice.invoice_items)
                const balanceDue = invoiceTotal - otherPaid

                if (validation.data.amount > balanceDue) {
                    return NextResponse.json(
                        { error: "Unprocessable Entity", details: "Updated amount would exceed balance due" },
                        { status: 422 }
                    )
                }
            }
        }

        const { data: payment, error } = await admin
            .from("payments")
            .update(validation.data)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        if (payment.invoice_id) {
            await reevaluateInvoiceStatus(admin, payment.invoice_id)
        }

        return NextResponse.json(payment)
    } catch (error) {
        console.error("Error updating payment:", error)
        return NextResponse.json({ error: "Failed to update payment" }, { status: 500 })
    }
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: "Forbidden: Admin Only" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

        const { data: payment } = await admin
            .from("payments")
            .select("invoice_id, journal_entry_id")
            .eq("id", id)
            .single()

        // Reverse the ledger entry before deleting the payment (FK cascades wipe lines)
        if (payment?.journal_entry_id) {
            try {
                await reverseEntry(admin, payment.journal_entry_id, "Payment deleted", user.id)
            } catch (revErr) {
                console.error("Failed to reverse payment entry:", revErr)
            }
        }

        const { error } = await admin.from("payments").delete().eq("id", id)
        if (error) throw error

        if (payment?.invoice_id) {
            await reevaluateInvoiceStatus(admin, payment.invoice_id)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting payment:", error)
        return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 })
    }
}
