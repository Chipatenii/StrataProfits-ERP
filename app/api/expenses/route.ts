import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createExpenseSchema } from "@/lib/schemas"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
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
