import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const assigneeId = searchParams.get("assignee_id")
        const status = searchParams.get("status")

        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        const userRole = profile?.role

        let query = admin
            .from("tasks")
            .select("*")
            .order("created_at", { ascending: false })

        // Security Check: Only Admin and VA can query other users' tasks
        if (assigneeId && assigneeId !== user.id) {
            if (userRole !== 'admin' && userRole !== 'virtual_assistant') {
                // For security, regular users checking others just get their own or nothing
                // But let's return 403 to be explicit
                return NextResponse.json({ error: "Forbidden: You can only view your own tasks" }, { status: 403 })
            }
            query = query.eq("assigned_to", assigneeId)
        } else if (!assigneeId && userRole !== 'admin' && userRole !== 'virtual_assistant') {
            // If no assignee specified, non-admins see ONLY their own tasks
            query = query.eq("assigned_to", user.id)
        } else if (assigneeId === user.id) {
            // User works looking up their own tasks
            query = query.eq("assigned_to", user.id)
        }
        // If Admin/VA and no assigneeId, they get all tasks (or we could enforce filtering, but "all" is useful for admin view)

        if (status) {
            query = query.eq("status", status)
        }

        const { data: tasks, error } = await query

        if (error) throw error

        return NextResponse.json(tasks || [])
    } catch (error) {
        console.error("Error fetching tasks:", error)
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
        }

        const admin = await createAdminClient()

        // Verify the caller owns this task or is an admin/VA
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        const userRole = profile?.role

        if (userRole !== 'admin' && userRole !== 'virtual_assistant') {
            const { data: task } = await admin.from("tasks").select("assigned_to, created_by").eq("id", id).single()
            if (!task || (task.assigned_to !== user.id && task.created_by !== user.id)) {
                return NextResponse.json({ error: "Forbidden: You can only update your own tasks" }, { status: 403 })
            }
        }

        const { data, error } = await admin
            .from("tasks")
            .update(updates)
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data || {})
    } catch (error) {
        console.error("Error updating task:", error)
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
    }
}
