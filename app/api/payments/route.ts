import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { generateDocumentNumber } from "@/lib/utils/document-numbers"

export const dynamic = 'force-dynamic'

const createPaymentSchema = z.object({
    invoice_id: z.string().uuid(),
    amount: z.number().positive(),
    currency: z.string().default('ZMW'),
    method: z.enum(['cash', 'bank_transfer', 'mobile_money', 'card', 'other']),
    reference: z.string().optional(),
    receipt_number: z.string().optional()
})

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
        const { data: payments, error } = await admin
            .from("payments")
            .select("*")
            .order("paid_at", { ascending: false })

        if (error) throw error

        return NextResponse.json(payments)
    } catch (error) {
        console.error("Error fetching payments:", error)
        return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
    }
}

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

        // 0. Prevent Overpayments
        const { data: invoice } = await admin.from("invoices").select("amount").eq("id", invoice_id).single()
        if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

        const { data: existingPayments } = await admin.from("payments").select("amount").eq("invoice_id", invoice_id)
        const totalPaid = (existingPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0)
        const balanceDue = invoice.amount - totalPaid

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

        // 2. Update Invoice Status
        await reevaluateInvoiceStatus(admin, invoice_id)

        return NextResponse.json(payment)

    } catch (error) {
        console.error("Error creating payment:", error)
        return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
    }
}

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

        const { data: payment } = await admin.from("payments").select("invoice_id").eq("id", id).single()

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

async function reevaluateInvoiceStatus(admin: any, invoiceId: string) {
    const { data: invoice } = await admin.from("invoices").select("amount").eq("id", invoiceId).single()
    const { data: payments } = await admin.from("payments").select("amount").eq("invoice_id", invoiceId)

    if (invoice && payments) {
        let totalDue = invoice.amount || 0;
        const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0)
        let newStatus = totalPaid >= totalDue ? 'paid' : totalPaid > 0 ? 'sent' : 'draft'
        await admin.from("invoices").update({ status: newStatus }).eq("id", invoiceId)
    }
}
