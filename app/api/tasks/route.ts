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

        // For "give me tasks for user X", include both primary and secondary assignments.
        const taskIdsForUser = async (uid: string): Promise<string[]> => {
            const { data } = await admin
                .from("task_assignees")
                .select("task_id")
                .eq("user_id", uid)
            return (data || []).map((r) => r.task_id)
        }

        // Security Check: Only Admin and VA can query other users' tasks
        if (assigneeId && assigneeId !== user.id) {
            if (userRole !== 'admin' && userRole !== 'virtual_assistant') {
                return NextResponse.json({ error: "Forbidden: You can only view your own tasks" }, { status: 403 })
            }
            const extra = await taskIdsForUser(assigneeId)
            const orFilter = [
                `assigned_to.eq.${assigneeId}`,
                ...(extra.length > 0 ? [`id.in.(${extra.join(",")})`] : []),
            ].join(",")
            query = query.or(orFilter)
        } else if (!assigneeId && userRole !== 'admin' && userRole !== 'virtual_assistant') {
            const extra = await taskIdsForUser(user.id)
            const orFilter = [
                `assigned_to.eq.${user.id}`,
                ...(extra.length > 0 ? [`id.in.(${extra.join(",")})`] : []),
            ].join(",")
            query = query.or(orFilter)
        } else if (assigneeId === user.id) {
            const extra = await taskIdsForUser(user.id)
            const orFilter = [
                `assigned_to.eq.${user.id}`,
                ...(extra.length > 0 ? [`id.in.(${extra.join(",")})`] : []),
            ].join(",")
            query = query.or(orFilter)
        }
        // If Admin/VA and no assigneeId, they get all tasks (or we could enforce filtering, but "all" is useful for admin view)

        if (status) {
            query = query.eq("status", status)
        }

        const { data: tasks, error } = await query

        if (error) throw error

        // Attach assignee_ids[] from the junction table.
        if (!tasks || tasks.length === 0) {
            return NextResponse.json([])
        }
        const ids = tasks.map((t) => t.id)
        const { data: links } = await admin
            .from("task_assignees")
            .select("task_id, user_id")
            .in("task_id", ids)
        const grouped = new Map<string, string[]>()
        ;(links || []).forEach((l) => {
            const arr = grouped.get(l.task_id) || []
            arr.push(l.user_id)
            grouped.set(l.task_id, arr)
        })
        return NextResponse.json(
            tasks.map((t) => ({ ...t, assignee_ids: grouped.get(t.id) || [] }))
        )
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
