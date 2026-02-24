import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createExpenseSchema } from "@/lib/schemas"
import { type NextRequest, NextResponse } from "next/server"

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

        const body = await request.json()
        const validation = createExpenseSchema.partial().safeParse(body)
        if (!validation.success) {
            return NextResponse.json({ error: "Validation failed" }, { status: 400 })
        }

        const { data: expense, error } = await admin
            .from("expenses")
            .update(validation.data)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

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
        const { data: existing } = await admin.from("expenses").select("submitted_by_user_id").eq("id", id).single()

        if (profile?.role !== 'admin' && existing?.submitted_by_user_id !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { error } = await admin.from("expenses").delete().eq("id", id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting expense:", error)
        return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 })
    }
}
