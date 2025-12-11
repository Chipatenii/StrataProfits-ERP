import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createClientSchema } from "@/lib/schemas"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        // Optional: Check if user is admin or VA if we want to restrict visibility
        // For now, assuming all authenticated team members can see clients list is standard,
        // but strictly abiding by "reuse permissions", admins/VAs definitely can.

        const admin = await createAdminClient()

        const { data: clients, error } = await admin
            .from("clients")
            .select("*")
            .order("created_at", { ascending: false })

        if (error) throw error

        return NextResponse.json(clients)
    } catch (error) {
        console.error("Error fetching clients:", error)
        return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const admin = await createAdminClient()
        // Check permissions
        const supabase = await createClient() // Create regular client to get user
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role !== 'admin' && profile?.role !== 'virtual_assistant') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()

        const validation = createClientSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.format() },
                { status: 400 }
            )
        }

        const { data: client, error } = await admin
            .from("clients")
            .insert(validation.data)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(client)
    } catch (error) {
        console.error("Error creating client:", error)
        return NextResponse.json({ error: "Failed to create client" }, { status: 500 })
    }
}
