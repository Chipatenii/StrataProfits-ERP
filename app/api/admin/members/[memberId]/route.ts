import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, { params }: { params: { memberId: string } }) {
  try {
    const admin = await createAdminClient()
    const { role } = await request.json()

    const { data, error } = await admin.from("profiles").update({ role }).eq("id", params.memberId).select()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating member:", error)
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { memberId: string } }) {
  try {
    const admin = await createAdminClient()

    // Delete from profiles table (auth user will remain but inactive)
    const { error } = await admin.from("profiles").delete().eq("id", params.memberId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting member:", error)
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 })
  }
}
