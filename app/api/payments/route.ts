import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

const createPaymentSchema = z.object({
    invoice_id: z.string().uuid(),
    amount: z.number().positive(),
    currency: z.string().default('ZMW'),
    method: z.enum(['cash', 'bank_transfer', 'mobile_money', 'card', 'other']),
    reference: z.string().optional()
})

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Check Role: Only Admin or Bookkeeper can record funds
    const admin = await createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

    if (!['admin', 'book_keeper'].includes(profile?.role)) {
        return NextResponse.json({ error: "Forbidden: Only Admin/Bookkeeper can record payments" }, { status: 403 })
    }

    try {
        const body = await request.json()
        const validation = createPaymentSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 })
        }

        const { invoice_id, amount } = validation.data

        // 1. Record Payment
        const { data: payment, error } = await admin.from("payments").insert({
            ...validation.data,
            received_by_user_id: user.id
        }).select().single()

        if (error) throw error

        // 2. Update Invoice Status
        // Calculate total payments vs total invoice amount
        const { data: invoice } = await admin.from("invoices").select("amount, items:invoice_items(quantity, unit_price)").eq("id", invoice_id).single()
        const { data: payments } = await admin.from("payments").select("amount").eq("invoice_id", invoice_id)

        if (invoice && payments) {
            // Calculate Total Due
            let totalDue = invoice.amount;
            if (invoice.items && invoice.items.length > 0) {
                totalDue = invoice.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0)
            }

            // Calculate Total Paid
            const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

            let newStatus = 'sent' // Default if balance remains
            if (totalPaid >= totalDue) {
                newStatus = 'paid'
            }

            await admin.from("invoices").update({ status: newStatus }).eq("id", invoice_id)
        }

        return NextResponse.json(payment)

    } catch (error) {
        console.error("Error creating payment:", error)
        return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
    }
}
