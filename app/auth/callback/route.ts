import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

// Server-side handler for Supabase auth-email callbacks (password recovery,
// email confirmation, magic link). It bridges PKCE (`?code=`) and the
// admin-generated link format (`?token_hash=&type=`) into the same redirect
// flow, then forwards the user to `?next=` (default `/dashboard`).
//
// Why server-side: PKCE stores the code verifier in a cookie when the flow
// is initiated. Only @supabase/ssr's server client can read that cookie to
// run `exchangeCodeForSession`. Doing it on the client raises "PKCE code
// verifier not found in storage" when the email is opened in a fresh tab.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") || "/dashboard"

  // Always resolve `next` against our own origin so we can't be used as an
  // open redirector.
  const safeNext = next.startsWith("/") ? next : "/dashboard"

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession failed:", error)
      const errorUrl = new URL("/auth/login", origin)
      errorUrl.searchParams.set("error", error.message)
      return NextResponse.redirect(errorUrl)
    }
    return NextResponse.redirect(new URL(safeNext, origin))
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      console.error("[auth/callback] verifyOtp failed:", error)
      const errorUrl = new URL("/auth/login", origin)
      errorUrl.searchParams.set("error", error.message)
      return NextResponse.redirect(errorUrl)
    }
    return NextResponse.redirect(new URL(safeNext, origin))
  }

  const errorUrl = new URL("/auth/login", origin)
  errorUrl.searchParams.set("error", "Invalid or expired auth link")
  return NextResponse.redirect(errorUrl)
}
