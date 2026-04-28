import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const bodySchema = z.union([
  z.object({
    mode: z.literal("set"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
  }),
  z.object({
    mode: z.literal("link"),
  }),
])

export async function POST(request: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = await createAdminClient()
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (callerProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const json = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", memberId)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    if (parsed.data.mode === "set") {
      const { error } = await admin.auth.admin.updateUserById(memberId, {
        password: parsed.data.newPassword,
      })
      if (error) {
        console.error("[reset-password] updateUserById failed:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      await admin.from("activity_logs").insert({
        actor_user_id: user.id,
        action: "password_set_by_admin",
        entity_type: "user",
        entity_id: memberId,
        metadata: { target_email: targetProfile.email },
      })

      return NextResponse.json({ success: true, mode: "set" })
    }

    // mode === "link" — generate a recovery link and email it via Supabase
    if (!targetProfile.email) {
      return NextResponse.json(
        { error: "Member has no email on file" },
        { status: 400 }
      )
    }

    const origin =
      request.headers.get("origin") ||
      request.nextUrl.origin ||
      ""
    const redirectTo = `${origin}/auth/reset-password`

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: targetProfile.email,
      options: { redirectTo },
    })

    if (error) {
      console.error("[reset-password] generateLink failed:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await admin.from("activity_logs").insert({
      actor_user_id: user.id,
      action: "password_reset_link_sent",
      entity_type: "user",
      entity_id: memberId,
      metadata: { target_email: targetProfile.email },
    })

    return NextResponse.json({
      success: true,
      mode: "link",
      action_link: data?.properties?.action_link ?? null,
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json(
      {
        error: "Failed to reset password",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
