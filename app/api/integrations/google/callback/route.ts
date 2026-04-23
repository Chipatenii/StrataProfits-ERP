import { createAdminClient } from "@/lib/supabase/admin"
import { exchangeCodeForTokens, getUserEmail } from "@/lib/google/drive"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

// GET /api/integrations/google/callback — receives Google's redirect
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const base = new URL(request.url).origin

    if (error) {
        return NextResponse.redirect(`${base}/files?drive_error=${encodeURIComponent(error)}`)
    }
    if (!code || !state) {
        return NextResponse.redirect(`${base}/files?drive_error=missing_code`)
    }

    // Verify state (HMAC of admin user id)
    const [payload, signature] = state.split(".")
    if (!payload || !signature) {
        return NextResponse.redirect(`${base}/files?drive_error=bad_state`)
    }
    const userId = Buffer.from(payload, "base64url").toString("utf8")
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback"
    const expected = crypto.createHmac("sha256", secret).update(userId).digest("base64url")
    if (expected !== signature) {
        return NextResponse.redirect(`${base}/files?drive_error=state_mismatch`)
    }

    try {
        const tokens = await exchangeCodeForTokens(code)
        if (!tokens.refresh_token) {
            return NextResponse.redirect(`${base}/files?drive_error=no_refresh_token`)
        }

        const email = await getUserEmail(tokens.access_token)
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

        const supabase = await createAdminClient()
        await supabase
            .from("integration_credentials")
            .upsert(
                {
                    provider: "google_drive",
                    account_email: email || null,
                    refresh_token: tokens.refresh_token,
                    access_token: tokens.access_token,
                    expires_at: expiresAt,
                    connected_by: userId,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "provider" }
            )

        return NextResponse.redirect(`${base}/files?tab=gdrive&connected=1`)
    } catch (err: any) {
        console.error("OAuth callback error:", err)
        return NextResponse.redirect(`${base}/files?drive_error=${encodeURIComponent(err.message || "oauth_failed")}`)
    }
}
