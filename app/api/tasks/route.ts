import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const assigneeId = searchParams.get("assignee_id")
        const status = searchParams.get("status")

        const admin = await createAdminClient()

        let query = admin
            .from("tasks")
            .select("*")
            .order("created_at", { ascending: false })

        if (assigneeId) {
            query = query.eq("assigned_to", assigneeId)
        }

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
        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
        }

        const admin = await createAdminClient()

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
