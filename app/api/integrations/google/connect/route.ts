import { createClient } from "@/lib/supabase/server"
import { buildAuthUrl } from "@/lib/google/drive"
import { NextResponse } from "next/server"
import crypto from "crypto"

// GET /api/integrations/google/connect — start OAuth flow (admin only)
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Only admins can connect Google Drive" }, { status: 403 })
        }

        // Signed state: base64(userId).sha256(userId+secret) — verified in callback.
        const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback"
        const payload = Buffer.from(user.id).toString("base64url")
        const signature = crypto.createHmac("sha256", secret).update(user.id).digest("base64url")
        const state = `${payload}.${signature}`

        return NextResponse.redirect(buildAuthUrl(state))
    } catch (error: any) {
        console.error("Google connect error:", error)
        return NextResponse.json({ error: error.message || "Failed to start OAuth" }, { status: 500 })
    }
}
