import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createMeetingSchema } from "@/lib/schemas"
import { type NextRequest, NextResponse } from "next/server"

async function syncMeetingAttendees(
    admin: Awaited<ReturnType<typeof createAdminClient>>,
    meetingId: string,
    userIds: string[]
) {
    const unique = Array.from(new Set(userIds.filter(Boolean)))
    await admin.from("meeting_attendees").delete().eq("meeting_id", meetingId)
    if (unique.length === 0) return
    const rows = unique.map((user_id) => ({ meeting_id: meetingId, user_id }))
    const { error } = await admin.from("meeting_attendees").insert(rows)
    if (error) console.error("[syncMeetingAttendees] insert failed:", error)
}

async function attachAttendees(
    admin: Awaited<ReturnType<typeof createAdminClient>>,
    meetings: Array<Record<string, unknown> & { id: string }>
) {
    if (meetings.length === 0) return meetings
    const ids = meetings.map((m) => m.id)
    const { data: links } = await admin
        .from("meeting_attendees")
        .select("meeting_id, user_id")
        .in("meeting_id", ids)
    const grouped = new Map<string, string[]>()
    ;(links || []).forEach((l) => {
        const arr = grouped.get(l.meeting_id) || []
        arr.push(l.user_id)
        grouped.set(l.meeting_id, arr)
    })
    return meetings.map((m) => ({ ...m, attendee_ids: grouped.get(m.id) || [] }))
}

export async function GET() {
    try {
        const supabase = await createClient()
        const admin = await createAdminClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Check role — clients are excluded entirely; all internal staff see the full schedule.
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role === 'client') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { data: meetings, error } = await admin
            .from("meetings")
            .select(`
        *,
        client:clients(id, name),
        project:projects(id, name),
        requested_by:profiles!meetings_requested_by_profile_fkey(full_name),
        assigned_to:profiles!meetings_assigned_to_profile_fkey(full_name)
      `)
            .order("date_time_start", { ascending: true })

        if (error) throw error

        const withAttendees = await attachAttendees(admin, (meetings as any[]) || [])
        return NextResponse.json(withAttendees)
    } catch (error) {
        console.error("Error fetching meetings:", error)
        return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const admin = await createAdminClient() // Use admin for writing to ensure consistency but validate user

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()

        const validation = createMeetingSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.format() },
                { status: 400 }
            )
        }

        // Build the full attendee set: primary first, then extras.
        const attendeeIds: string[] = []
        if (validation.data.assigned_to_user_id) attendeeIds.push(validation.data.assigned_to_user_id)
        for (const id of validation.data.attendee_ids ?? []) {
            if (!attendeeIds.includes(id)) attendeeIds.push(id)
        }

        const { attendee_ids: _ignoredAttendeeIds, ...validatedRest } = validation.data
        void _ignoredAttendeeIds

        // Force the requested_by to be the current user; primary attendee is the first one.
        const meetingData = {
            ...validatedRest,
            requested_by_user_id: user.id,
            assigned_to_user_id: attendeeIds[0] ?? null,
        }

        const { data: meeting, error } = await admin
            .from("meetings")
            .insert(meetingData)
            .select()
            .single()

        if (error) throw error

        if (meeting?.id) {
            await syncMeetingAttendees(admin, meeting.id, attendeeIds)
        }

        return NextResponse.json({ ...meeting, attendee_ids: attendeeIds })
    } catch (error) {
        console.error("Error creating meeting:", error)
        return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()
        const admin = await createAdminClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { id, attendee_ids: rawAttendeeIds, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: "Meeting ID required" }, { status: 400 })
        }

        // If the caller sent attendee changes, build the canonical list and
        // keep `assigned_to_user_id` (primary) in sync.
        const attendeeIdsField: string[] | undefined = Array.isArray(rawAttendeeIds)
            ? rawAttendeeIds.filter((x: unknown): x is string => typeof x === "string")
            : undefined

        const requestedAttendeeIds: string[] = []
        if (typeof updates.assigned_to_user_id === "string" && updates.assigned_to_user_id) {
            requestedAttendeeIds.push(updates.assigned_to_user_id)
        }
        if (attendeeIdsField) {
            for (const aid of attendeeIdsField) {
                if (!requestedAttendeeIds.includes(aid)) requestedAttendeeIds.push(aid)
            }
            updates.assigned_to_user_id = requestedAttendeeIds[0] ?? null
        }

        const { data: meeting, error } = await admin
            .from("meetings")
            .update(updates)
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        if (attendeeIdsField || typeof updates.assigned_to_user_id === "string") {
            await syncMeetingAttendees(admin, id, requestedAttendeeIds)
        }

        return NextResponse.json(meeting)
    } catch (error) {
        console.error("Error updating meeting:", error)
        return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const admin = await createAdminClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "Meeting ID required" }, { status: 400 })
        }

        const { error } = await admin
            .from("meetings")
            .delete()
            .eq("id", id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting meeting:", error)
        return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 })
    }
}
