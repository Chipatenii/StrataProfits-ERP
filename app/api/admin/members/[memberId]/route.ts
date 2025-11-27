import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params
    const admin = await createAdminClient()
    const body = await request.json()
    const { role, hourly_rate } = body

    console.log('Update member request:', { memberId, role, hourly_rate })

    const updateData: any = {}
    if (role) updateData.role = role
    if (hourly_rate !== undefined) updateData.hourly_rate = hourly_rate

    console.log('Update data:', updateData)

    const { data, error } = await admin.from("profiles").update(updateData).eq("id", memberId).select()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log('Update successful:', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating member:", error)
    return NextResponse.json({
      error: "Failed to update member",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params
    const admin = await createAdminClient()

    // Delete from profiles table (auth user will remain but inactive)
    const { error } = await admin.from("profiles").delete().eq("id", memberId)

    if (error) {
      console.error('Supabase delete error:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting member:", error)
    return NextResponse.json({
      error: "Failed to delete member",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
