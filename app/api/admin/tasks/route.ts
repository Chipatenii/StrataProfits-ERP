import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const admin = await createAdminClient()

    // Fetch all tasks with admin client to bypass RLS
    const { data: tasks, error } = await admin.from("tasks").select("*").order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(tasks || [])
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await createAdminClient()
    const body = await request.json()

    const { data: task, error } = await admin
      .from("tasks")
      .insert({
        title: body.title,
        description: body.description,
        priority: body.priority,
        assigned_to: body.assigned_to || null,
        created_by: body.created_by,
        estimated_hours: body.estimated_hours || null,
      })
      .select()

    if (error) throw error

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
