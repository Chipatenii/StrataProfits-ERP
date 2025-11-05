import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest) {
  try {
    const { userId, fullName } = await request.json()

    if (!userId || !fullName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const admin = await createAdminClient()

    const { error } = await admin.from("profiles").update({ full_name: fullName }).eq("id", userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
