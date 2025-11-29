import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

import { updateMemberSchema } from "@/lib/schemas"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  try {
    const { memberId } = await params
    const admin = await createAdminClient()
    const body = await request.json()

    // Validate request body
    const validation = updateMemberSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      )
    }

    const { role, hourly_rate } = validation.data

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
    const { error: profileError } = await admin.from("profiles").delete().eq("id", memberId)

    if (profileError) {
      console.error('Supabase delete error:', profileError)
      throw profileError
    }

    // Delete from auth.users to allow re-registration
    const { error: authError } = await admin.auth.admin.deleteUser(memberId)

    if (authError) {
      console.error('Auth delete error:', authError)
      // Note: We don't throw here because the profile is already deleted, 
      // but we log it. In a transaction this would be better.
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
