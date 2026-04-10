import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

import { updateMemberSchema } from "@/lib/schemas"

export async function GET(request: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Check if admin
    const admin = await createAdminClient()
    const { data: profile, error: profileError } = await admin.from("profiles").select("role").eq("id", user.id).single()

    console.log("[API Admin Member] User:", user.id, "Role:", profile?.role, "Error:", profileError)

    if (profile?.role !== 'admin') {
      console.log("[API Admin Member] Access denied. Role is not admin.")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data, error } = await admin
      .from("profiles")
      .select("*")
      .eq("id", memberId)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching member:", error)
    return NextResponse.json({ error: "Failed to fetch member" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = await createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    // Validate request body
    const validation = updateMemberSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 })
    }

    const { role, hourly_rate } = validation.data

    const updateData: Record<string, unknown> = {}
    if (role) updateData.role = role
    if (hourly_rate !== undefined) updateData.hourly_rate = hourly_rate

    const { data, error } = await admin.from("profiles").update(updateData).eq("id", memberId).select()

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating member:", error)
    return NextResponse.json(
      {
        error: "Failed to update member",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = await createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    // Delete auth user first. If this fails, no partial state is left.
    const { error: authError } = await admin.auth.admin.deleteUser(memberId)

    if (authError) {
      console.error("Auth delete error:", authError)
      throw authError
    }

    // Auth delete cascades to profiles via FK (on delete cascade), but we
    // explicitly delete to be safe and get a clear error if it fails.
    const { error: profileError } = await admin.from("profiles").delete().eq("id", memberId)

    if (profileError) {
      // Profile may already be gone via cascade — log but don't fail the request.
      console.error("Profile delete error (may be cascaded already):", profileError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting member:", error)
    return NextResponse.json(
      {
        error: "Failed to delete member",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
