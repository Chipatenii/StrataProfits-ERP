import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/hr/time-off — fetch time-off requests
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

        const isAdmin = profile.role === "admin"
        const isVA = profile.role === "virtual_assistant"

        const { searchParams } = new URL(request.url)
        const statusFilter = searchParams.get("status")

        let query = supabase
            .from("time_off_requests")
            .select("*, user:profiles!time_off_requests_user_id_fkey(id, full_name, email, role, avatar_url), reviewer:profiles!time_off_requests_reviewed_by_fkey(id, full_name)")
            .order("created_at", { ascending: false })

        // Non-admin/VA users only see their own
        if (!isAdmin && !isVA) {
            query = query.eq("user_id", user.id)
        }

        if (statusFilter) {
            query = query.eq("status", statusFilter)
        }

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json(data || [])
    } catch (error: any) {
        console.error("GET /api/hr/time-off error:", error)
        return NextResponse.json({ error: error.message || "Failed to fetch time-off requests" }, { status: 500 })
    }
}

// POST /api/hr/time-off — create a new time-off request
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const body = await request.json()
        const { type, start_date, end_date, reason } = body

        if (!start_date || !end_date) {
            return NextResponse.json({ error: "Start and end dates are required" }, { status: 400 })
        }

        const validTypes = ["vacation", "sick", "personal", "unpaid", "other"] as const
        const resolvedType: string = validTypes.includes(type) ? type : "vacation"

        const start = new Date(start_date)
        const end = new Date(end_date)

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
        }

        if (end < start) {
            return NextResponse.json({ error: "End date must be on or after start date" }, { status: 400 })
        }

        // Server-side computation of days_count to prevent client manipulation.
        // +1 because both boundary days are inclusive (Mon–Fri = 5 days).
        const diffMs = end.getTime() - start.getTime()
        const days_count = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1

        const { data, error } = await supabase
            .from("time_off_requests")
            .insert({
                user_id: user.id,
                type: resolvedType,
                start_date,
                end_date,
                days_count,
                reason: reason || null,
                status: "pending",
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data, { status: 201 })
    } catch (error: any) {
        console.error("POST /api/hr/time-off error:", error)
        return NextResponse.json({ error: error.message || "Failed to create time-off request" }, { status: 500 })
    }
}
