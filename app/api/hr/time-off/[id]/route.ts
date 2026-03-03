import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// PATCH /api/hr/time-off/[id] — approve/reject/cancel a request
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

        const body = await request.json()
        const { status, reviewer_notes } = body

        // Validate status transitions
        const validStatuses = ["approved", "rejected", "cancelled"]
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status. Must be: approved, rejected, or cancelled" }, { status: 400 })
        }

        // Only admins/VAs can approve or reject
        if ((status === "approved" || status === "rejected") && profile.role !== "admin" && profile.role !== "virtual_assistant") {
            return NextResponse.json({ error: "Only admins can approve or reject requests" }, { status: 403 })
        }

        // For cancellation, verify it's the requester's own request
        if (status === "cancelled") {
            const { data: existingRequest } = await supabase.from("time_off_requests").select("user_id").eq("id", id).single()
            if (existingRequest?.user_id !== user.id && profile.role !== "admin") {
                return NextResponse.json({ error: "You can only cancel your own requests" }, { status: 403 })
            }
        }

        const updatePayload: Record<string, any> = {
            status,
            updated_at: new Date().toISOString(),
        }

        if (status === "approved" || status === "rejected") {
            updatePayload.reviewed_by = user.id
            updatePayload.reviewed_at = new Date().toISOString()
            if (reviewer_notes) updatePayload.reviewer_notes = reviewer_notes
        }

        const { data, error } = await supabase
            .from("time_off_requests")
            .update(updatePayload)
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error("PATCH /api/hr/time-off/[id] error:", error)
        return NextResponse.json({ error: error.message || "Failed to update request" }, { status: 500 })
    }
}

// DELETE /api/hr/time-off/[id] — delete a request (admin only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 })
        }

        const { error } = await supabase.from("time_off_requests").delete().eq("id", id)
        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("DELETE /api/hr/time-off/[id] error:", error)
        return NextResponse.json({ error: error.message || "Failed to delete request" }, { status: 500 })
    }
}
