import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createClientSchema } from "@/lib/schemas"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const admin = await createAdminClient()
        // Verify admin/va role
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        if (!['admin', 'virtual_assistant', 'book_keeper'].includes(profile?.role)) {
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

        const { error } = await admin
            .from("clients")
            .update(validation.data)
            .eq("id", id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error updating client:", error)
        return NextResponse.json({ error: "Failed to update client" }, { status: 500 })
    }
}
