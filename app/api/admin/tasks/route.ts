import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { APP_CONFIG } from "@/lib/config"

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

import { createTaskSchema } from "@/lib/schemas"

export async function POST(request: NextRequest) {
  try {
    const admin = await createAdminClient()
    const body = await request.json()

    // Validate request body
    const validation = createTaskSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      )
    }

    // If project_id is present but no deliverable_id, and flag is on
    if (APP_CONFIG.features.ff_deliverables_enabled && validation.data.project_id && !validation.data.deliverable_id) {
      let { data: defaultDeliverable } = await admin
        .from("deliverables")
        .select("id")
        .eq("project_id", validation.data.project_id)
        .eq("is_default", true)
        .single()

      // If for some reason a default doesn't exist (e.g. migration failed for this project), create it on the fly
      if (!defaultDeliverable) {
        const { data: newDefault, error: createError } = await admin
          .from("deliverables")
          .insert({
            project_id: validation.data.project_id,
            name: "General Implementation",
            status: "in_progress",
            is_default: true
          })
          .select("id")
          .single()

        if (!createError && newDefault) {
          defaultDeliverable = newDefault
        }
      }

      if (defaultDeliverable) {
        validation.data.deliverable_id = defaultDeliverable.id
      }
    }

    const { data: task, error } = await admin
      .from("tasks")
      .insert(validation.data)
      .select()

    if (error) throw error

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    const body = await request.json()

    const { data: task, error } = await admin
      .from("tasks")
      .update(body)
      .eq("id", id)
      .select()

    if (error) throw error

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const allCompleted = searchParams.get("all_completed")

    if (allCompleted === "true") {
      const { error } = await admin.from("tasks").delete().eq("status", "completed")
      if (error) throw error
      return NextResponse.json({ success: true, message: "All completed tasks deleted" })
    }

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    const { error } = await admin.from("tasks").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
