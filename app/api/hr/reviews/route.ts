import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/hr/reviews — fetch performance reviews
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

        const isAdmin = profile.role === "admin"

        let query = supabase
            .from("performance_reviews")
            .select("*, user:profiles!performance_reviews_user_id_fkey(id, full_name, email, role, avatar_url), reviewer:profiles!performance_reviews_reviewer_id_fkey(id, full_name)")
            .order("created_at", { ascending: false })

        // Non-admins only see their own published reviews
        if (!isAdmin) {
            query = query.eq("user_id", user.id).eq("status", "published")
        }

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json(data || [])
    } catch (error: any) {
        console.error("GET /api/hr/reviews error:", error)
        return NextResponse.json({ error: error.message || "Failed to fetch reviews" }, { status: 500 })
    }
}

// POST /api/hr/reviews — create a performance review (admin only)
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 })
        }

        const body = await request.json()
        const { user_id, review_period, overall_rating, strengths, areas_for_improvement, goals, additional_notes, status } = body

        if (!user_id || !review_period) {
            return NextResponse.json({ error: "user_id and review_period are required" }, { status: 400 })
        }

        const { data, error } = await supabase
            .from("performance_reviews")
            .insert({
                user_id,
                reviewer_id: user.id,
                review_period,
                overall_rating: overall_rating || null,
                strengths: strengths || null,
                areas_for_improvement: areas_for_improvement || null,
                goals: goals || null,
                additional_notes: additional_notes || null,
                status: status || "draft",
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data, { status: 201 })
    } catch (error: any) {
        console.error("POST /api/hr/reviews error:", error)
        return NextResponse.json({ error: error.message || "Failed to create review" }, { status: 500 })
    }
}

// PATCH /api/hr/reviews — update a performance review (admin only)
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 })
        }

        const body = await request.json()
        const { id, ...updates } = body

        if (!id) return NextResponse.json({ error: "Review ID is required" }, { status: 400 })

        const { data, error } = await supabase
            .from("performance_reviews")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error("PATCH /api/hr/reviews error:", error)
        return NextResponse.json({ error: error.message || "Failed to update review" }, { status: 500 })
    }
}
