import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createDealSchema } from "@/lib/schemas"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const admin = await createAdminClient()
        const supabase = await createClient()

        // Auth Check
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Role Check
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        // Allowed roles: admin, virtual_assistant (can see everything for now, or filter to assigned)
        // For now, allow admin and VAs to see the pipeline.
        if (profile?.role !== 'admin' && profile?.role !== 'virtual_assistant') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

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

export async function PATCH(request: NextRequest) {
    try {
        const admin = await createAdminClient()
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role !== 'admin' && profile?.role !== 'virtual_assistant') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

        const body = await request.json()
        const validation = createDealSchema.partial().safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.format() },
                { status: 400 }
            )
        }

        const { data: deal, error } = await admin
            .from("deals")
            .update(validation.data)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(deal)
    } catch (error) {
        console.error("Error updating deal:", error)
        return NextResponse.json({ error: "Failed to update deal" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const admin = await createAdminClient()
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: "Forbidden (Admin only)" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

        const { error } = await admin
            .from("deals")
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting deal:", error)
        return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 })
    }
}
