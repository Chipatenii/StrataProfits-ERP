import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// GET /api/integrations/google/status — returns whether Google Drive is connected (no secrets)
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role === "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

        const admin = await createAdminClient()
        const { data } = await admin
            .from("integration_credentials")
            .select("account_email, connected_by, created_at")
            .eq("provider", "google_drive")
            .maybeSingle()

        return NextResponse.json({
            connected: !!data,
            account_email: data?.account_email || null,
            connected_at: data?.created_at || null,
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed" }, { status: 500 })
    }
}
