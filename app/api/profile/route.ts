import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { updateProfileSchema } from "@/lib/schemas"

export async function PATCH(request: NextRequest) {
  try {
    const admin = await createAdminClient()
    const body = await request.json()

    // Validate request body
    const validation = updateProfileSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      )
    }

    const { userId, fullName } = validation.data

    const { data, error } = await admin
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", userId)
      .select()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
