import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createMeetingSchema } from "@/lib/schemas"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const admin = await createAdminClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Check role
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        const isAdminOrVA = profile?.role === 'admin' || profile?.role === 'virtual_assistant'

        let query = admin
            .from("meetings")
            .select(`
        *,
        client:clients(id, name),
        project:projects(id, name),
        requested_by:profiles!meetings_requested_by_profile_fkey(full_name),
        assigned_to:profiles!meetings_assigned_to_profile_fkey(full_name)
      `)
            .order("date_time_start", { ascending: true })

        // Non-admins only see meetings they requested or are assigned to
        if (!isAdminOrVA) {
            query = query.or(`requested_by_user_id.eq.${user.id},assigned_to_user_id.eq.${user.id}`)
        }

        const { data: meetings, error } = await query

        if (error) throw error

        return NextResponse.json(meetings)
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

        // Force the requested_by to be the current user
        const meetingData = {
            ...validation.data,
            requested_by_user_id: user.id
        }

        const { data: meeting, error } = await admin
            .from("meetings")
            .insert(meetingData)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(meeting)
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
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: "Meeting ID required" }, { status: 400 })
        }

        // Validate basic update structure (optional but good practice)
        // For now allowing partial updates to any field except ID

        const { data: meeting, error } = await admin
            .from("meetings")
            .update(updates)
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(meeting)
    } catch (error) {
        console.error("Error updating meeting:", error)
        return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 })
    }
}
