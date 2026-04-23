import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// POST /api/integrations/google/disconnect — admin removes connection
export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Only admins can disconnect" }, { status: 403 })
        }

        const admin = await createAdminClient()
        await admin.from("integration_credentials").delete().eq("provider", "google_drive")

        return NextResponse.json({ ok: true })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed" }, { status: 500 })
    }
}
