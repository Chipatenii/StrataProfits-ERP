import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

export const dynamic = 'force-dynamic'

const createTeamPaymentSchema = z.object({
    user_id: z.string().uuid(),
    amount: z.number().positive(),
    currency: z.string().default('ZMW'),
    payment_method: z.string(),
    reference: z.string().optional(),
    period_start: z.string().optional(),
    period_end: z.string().optional(),
    notes: z.string().optional()
})

export async function GET(request: NextRequest) {
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
        const userId = searchParams.get('userId')
        const periodStart = searchParams.get('periodStart')
        const periodEnd = searchParams.get('periodEnd')

        let query = admin.from("team_payments").select(`
            *,
            paid_by_profile:profiles!team_payments_paid_by_fkey(full_name),
            recipient_profile:profiles!team_payments_user_id_fkey(full_name)
        `).order("payment_date", { ascending: false })

        if (userId) {
            query = query.eq("user_id", userId)
        }
        
        // If filtering by a specific month (e.g., matching the report's period)
        // We can approximate by checking if the payment date falls in the month, 
        // or by explicitly checking period_start/period_end if provided.
        if (periodStart) {
            query = query.gte("period_start", periodStart)
        }
        if (periodEnd) {
            query = query.lte("period_end", periodEnd)
        }

        const { data: payments, error } = await query

        if (error) throw error

        return NextResponse.json(payments)
    } catch (error) {
        console.error("Error fetching team payments:", error)
        return NextResponse.json({ error: "Failed to fetch team payments" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        // Check Role: Only Admin or Bookkeeper can record payroll
        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        if (!['admin', 'book_keeper'].includes(profile?.role)) {
            return NextResponse.json({ error: "Forbidden: Only Admin/Bookkeeper can record team payments" }, { status: 403 })
        }

        const body = await request.json()
        const validation = createTeamPaymentSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 })
        }

        // Record Payment
        const paymentData = { 
            ...validation.data,
            paid_by: user.id,
            payment_date: new Date().toISOString()
        }
        
        const { data: payment, error } = await admin.from("team_payments").insert(paymentData).select().single()

        if (error) throw error

        return NextResponse.json(payment)

    } catch (error) {
        console.error("Error creating team payment:", error)
        return NextResponse.json({ error: "Failed to record team payment" }, { status: 500 })
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

        const { error } = await admin.from("team_payments").delete().eq("id", id)
        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting team payment:", error)
        return NextResponse.json({ error: "Failed to delete team payment" }, { status: 500 })
    }
}
