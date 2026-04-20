import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createExpenseSchema } from "@/lib/schemas"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { postExpense, reverseEntry } from "@/lib/ledger/post"

const updateExpenseSchema = createExpenseSchema.partial().extend({
    status: z.enum(["Pending", "Approved", "Rejected", "Paid"]).optional(),
    paid_at: z.string().optional().nullable(),
    expense_account_id: z.string().uuid().optional().nullable(),
    paid_from_account_id: z.string().uuid().optional().nullable(),
})

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()
        const admin = await createAdminClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Check role
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        const isAdmin = profile?.role === 'admin'

        let query = admin
            .from("expenses")
            .select(`
        *,
        submitted_by:profiles!expenses_submitted_by_profile_fkey(full_name),
        client:clients(name),
        project:projects(name)
      `)
            .order("created_at", { ascending: false })

        if (!isAdmin) {
            query = query.eq("submitted_by_user_id", user.id)
        }

        const { data: expenses, error } = await query

        if (error) throw error

        return NextResponse.json(expenses)
    } catch (error) {
        console.error("Error fetching expenses:", error)
        return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const admin = await createAdminClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()

        const validation = createExpenseSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.format() },
                { status: 400 }
            )
        }

        const expenseData = {
            ...validation.data,
            submitted_by_user_id: user.id
        }

        const { data: expense, error } = await admin
            .from("expenses")
            .insert(expenseData)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(expense)
    } catch (error) {
        console.error("Error creating expense:", error)
        return NextResponse.json({ error: "Failed to create expense" }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()
        const admin = await createAdminClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

        // FIX: mirror DELETE's ownership/role check so non-admins cannot edit others' expenses
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        const { data: existing } = await admin.from("expenses").select("submitted_by_user_id").eq("id", id).single()

        if (profile?.role !== 'admin' && existing?.submitted_by_user_id !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()
        const validation = updateExpenseSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 })
        }

        const { data: priorExpense } = await admin
            .from("expenses")
            .select("status, paid_at, journal_entry_id")
            .eq("id", id)
            .single()

        const updatePayload = { ...validation.data } as Record<string, any>

        // When an admin/bookkeeper marks an expense Paid, stamp paid_at if not supplied
        if (
            validation.data.status === "Paid" &&
            priorExpense?.status !== "Paid" &&
            !updatePayload.paid_at
        ) {
            if (profile?.role !== "admin" && profile?.role !== "book_keeper") {
                return NextResponse.json({ error: "Only admin/bookkeeper can mark expenses Paid" }, { status: 403 })
            }
            updatePayload.paid_at = new Date().toISOString()
        }

        const { data: expense, error } = await admin
            .from("expenses")
            .update(updatePayload)
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        // Cash-basis: post to GL only on Pending/Approved -> Paid transition
        if (
            expense.status === "Paid" &&
            priorExpense?.status !== "Paid" &&
            !priorExpense?.journal_entry_id
        ) {
            try {
                await postExpense(admin, expense)
            } catch (ledgerErr) {
                console.error("Ledger posting failed for expense:", expense.id, ledgerErr)
            }
        }

        return NextResponse.json(expense)
    } catch (error) {
        console.error("Error updating expense:", error)
        return NextResponse.json({ error: "Failed to update expense" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const admin = await createAdminClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

        // Role Check: Only Admin or the Person who submitted it can delete
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        const { data: existing } = await admin
            .from("expenses")
            .select("submitted_by_user_id, journal_entry_id")
            .eq("id", id)
            .single()

        if (profile?.role !== 'admin' && existing?.submitted_by_user_id !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Reverse ledger entry before deletion (FK cascade would wipe lines)
        if (existing?.journal_entry_id) {
            try {
                await reverseEntry(admin, existing.journal_entry_id, "Expense deleted", user.id)
            } catch (revErr) {
                console.error("Failed to reverse expense entry:", revErr)
            }
        }

        const { error } = await admin.from("expenses").delete().eq("id", id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting expense:", error)
        return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 })
    }
}
