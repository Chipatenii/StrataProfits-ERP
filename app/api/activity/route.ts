import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/activity — fetch recent activity log
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get("limit") || "30")
        const entityType = searchParams.get("entity_type")

        let query = supabase
            .from("activity_log")
            .select("*, user:profiles!activity_log_user_id_fkey(id, full_name, avatar_url, role)")
            .order("created_at", { ascending: false })
            .limit(Math.min(limit, 100))

        if (entityType) query = query.eq("entity_type", entityType)

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json(data || [])
    } catch (error: any) {
        console.error("GET /api/activity error:", error)
        return NextResponse.json({ error: error.message || "Failed to fetch activity" }, { status: 500 })
    }
}

// POST /api/activity — log a new activity
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const body = await request.json()
        const { action, entity_type, entity_id, metadata } = body

        if (!action || !entity_type) {
            return NextResponse.json({ error: "action and entity_type are required" }, { status: 400 })
        }

        const { data, error } = await supabase
            .from("activity_log")
            .insert({
                user_id: user.id,
                action,
                entity_type,
                entity_id: entity_id || null,
                metadata: metadata || {},
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data, { status: 201 })
    } catch (error: any) {
        console.error("POST /api/activity error:", error)
        return NextResponse.json({ error: error.message || "Failed to log activity" }, { status: 500 })
    }
}
