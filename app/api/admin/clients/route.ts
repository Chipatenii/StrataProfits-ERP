import { createAdminClient } from "@/lib/supabase/admin"
import { createClientSchema } from "@/lib/schemas"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
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
