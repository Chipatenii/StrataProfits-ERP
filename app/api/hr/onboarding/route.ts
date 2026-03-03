import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/hr/onboarding — fetch onboarding tasks & user progress
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const userId = searchParams.get("user_id")

        // Fetch global onboarding tasks
        const { data: tasks, error: tasksError } = await supabase
            .from("onboarding_tasks")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })

        if (tasksError) throw tasksError

        // Fetch progress for the specified user (or current user)
        const targetUserId = userId || user.id
        const { data: progress, error: progressError } = await supabase
            .from("user_onboarding_progress")
            .select("*")
            .eq("user_id", targetUserId)

        if (progressError) throw progressError

        return NextResponse.json({ tasks: tasks || [], progress: progress || [] })
    } catch (error: any) {
        console.error("GET /api/hr/onboarding error:", error)
        return NextResponse.json({ error: error.message || "Failed to fetch onboarding data" }, { status: 500 })
    }
}

// POST /api/hr/onboarding — create a new onboarding task (admin) or toggle progress (user)
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const body = await request.json()

        // If action is toggle_progress, update user's progress
        if (body.action === "toggle_progress") {
            const { task_id, completed } = body
            if (!task_id) return NextResponse.json({ error: "task_id is required" }, { status: 400 })

            // Upsert progress record
            const { data, error } = await supabase
                .from("user_onboarding_progress")
                .upsert({
                    user_id: user.id,
                    task_id,
                    completed: completed ?? true,
                    completed_at: completed ? new Date().toISOString() : null,
                }, { onConflict: "user_id,task_id" })
                .select()
                .single()

            if (error) throw error
            return NextResponse.json(data)
        }

        // Otherwise, creating a new global onboarding task (admin only)
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 })
        }

        const { title, description, category, sort_order } = body
        if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 })

        const { data, error } = await supabase
            .from("onboarding_tasks")
            .insert({
                title,
                description: description || null,
                category: category || "General",
                sort_order: sort_order ?? 0,
            })
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data, { status: 201 })
    } catch (error: any) {
        console.error("POST /api/hr/onboarding error:", error)
        return NextResponse.json({ error: error.message || "Failed to process onboarding request" }, { status: 500 })
    }
}

// PATCH /api/hr/onboarding — update an onboarding task (admin only)
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

        if (!id) return NextResponse.json({ error: "Task ID is required" }, { status: 400 })

        const { data, error } = await supabase
            .from("onboarding_tasks")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data)
    } catch (error: any) {
        console.error("PATCH /api/hr/onboarding error:", error)
        return NextResponse.json({ error: error.message || "Failed to update task" }, { status: 500 })
    }
}

// DELETE /api/hr/onboarding — delete an onboarding task (admin only)
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")
        if (!id) return NextResponse.json({ error: "Task ID is required" }, { status: 400 })

        const { error } = await supabase.from("onboarding_tasks").delete().eq("id", id)
        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("DELETE /api/hr/onboarding error:", error)
        return NextResponse.json({ error: error.message || "Failed to delete task" }, { status: 500 })
    }
}
