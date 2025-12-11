import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createDealSchema } from "@/lib/schemas"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const admin = await createAdminClient()

        // Fetch deals with related client and project info
        const { data: deals, error } = await admin
            .from("deals")
            .select(`
        *,
        client:clients(id, name),
        project:projects(id, name)
      `)
            .order("created_at", { ascending: false })

        if (error) throw error

        return NextResponse.json(deals)
    } catch (error) {
        console.error("Error fetching deals:", error)
        return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const admin = await createAdminClient()
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role !== 'admin' && profile?.role !== 'virtual_assistant') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()

        const validation = createDealSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.format() },
                { status: 400 }
            )
        }

        const { data: deal, error } = await admin
            .from("deals")
            .insert(validation.data)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(deal)
    } catch (error) {
        console.error("Error creating deal:", error)
        return NextResponse.json({ error: "Failed to create deal" }, { status: 500 })
    }
}
