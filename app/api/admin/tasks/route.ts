import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { APP_CONFIG } from "@/lib/config"
import { createTaskSchema } from "@/lib/schemas"

// Roles that can have tasks assigned to them (not admin, not VA)
const ASSIGNABLE_ROLES = ['team_member', 'developer', 'social_media_manager', 'book_keeper', 'marketing', 'sales', 'graphic_designer']

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    const userRole = profile?.role

    // Role-based access:
    // - Admin: See all tasks
    // - VA: See tasks assigned to team members (not admin/VA)
    // - Team members (and other non-admin roles): See only their own tasks

    if (userRole === 'admin') {
      // Admin sees all tasks
      const { data: tasks, error } = await admin
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      return NextResponse.json(tasks || [])
    }

    if (userRole === 'virtual_assistant') {
      // VA sees only tasks assigned to team members (using assignable roles)
      // First get all users with assignable roles
      const { data: teamMembers } = await admin
        .from("profiles")
        .select("id")
        .in("role", ASSIGNABLE_ROLES)

      const teamMemberIds = teamMembers?.map(m => m.id) || []

      if (teamMemberIds.length === 0) {
        return NextResponse.json([])
      }

      const { data: tasks, error } = await admin
        .from("tasks")
        .select("*")
        .in("assigned_to", teamMemberIds)
        .order("created_at", { ascending: false })

      if (error) throw error
      return NextResponse.json(tasks || [])
    }

    // Team members and other roles: see only their own tasks
    const { data: tasks, error } = await admin
      .from("tasks")
      .select("*")
      .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json(tasks || [])
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    const userRole = profile?.role

    // Admin, VA, and Team members can create tasks now
    if (userRole !== 'admin' && userRole !== 'virtual_assistant' && !ASSIGNABLE_ROLES.includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    // Validate request body
    const validation = createTaskSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      )
    }

    // Prevent assigning tasks to admin or VA
    if (validation.data.assigned_to) {
      const { data: assigneeProfile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", validation.data.assigned_to)
        .single()

      if (assigneeProfile?.role === 'admin' || assigneeProfile?.role === 'virtual_assistant') {
        return NextResponse.json(
          { error: "Tasks cannot be assigned to admins or virtual assistants" },
          { status: 400 }
        )
      }
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

    // Apply role-based creation rules
    let finalStatus = validation.data.status || 'todo'
    let finalAssignedTo = validation.data.assigned_to
    
    if (userRole === 'team_member' || ASSIGNABLE_ROLES.includes(userRole)) {
      if (userRole !== 'virtual_assistant' && userRole !== 'admin') {
         // Team Member: must assign to self, default to pending_approval
         finalAssignedTo = user.id
         if (finalStatus !== 'pending_approval') {
             finalStatus = 'pending_approval' // Enforce default unless specifically creating differently (but requirement says "must"). Let's enforce.
         }
      } else if (userRole === 'virtual_assistant') {
         // Virtual Assistant: can assign anyone else valid, but default status must be pending_approval
         if (finalStatus !== 'pending_approval') {
             finalStatus = 'pending_approval'
         }
      }
    }

    const taskData = {
      ...validation.data,
      assigned_to: finalAssignedTo, // Output correct assignee natively
      status: finalStatus,
      created_by: user.id,
      assigned_by: user.id, // Track who actually created/assigned it
      approval_status: (userRole === 'virtual_assistant' || (!['admin', 'virtual_assistant'].includes(userRole))) ? 'pending' : 'auto_approved'
    }

    const { data: task, error } = await admin
      .from("tasks")
      .insert(taskData)
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role, full_name").eq("id", user.id).single()
    const userRole = profile?.role

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    const body = await request.json()

    // Get existing task
    const { data: existingTask } = await admin
      .from("tasks")
      .select("*, assignee:profiles!assigned_to(role)")
      .eq("id", id)
      .single()

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Role-based update permissions:
    // - Admin: can update any task
    // - VA: can update tasks assigned to team members only (not admin/VA tasks)
    // - Team members: can only update status to "completed" on their own tasks

    if (userRole === 'admin') {
      // Admin can do anything, but prevent assigning to admin/VA
      if (body.assigned_to) {
        const { data: newAssignee } = await admin
          .from("profiles")
          .select("role")
          .eq("id", body.assigned_to)
          .single()

        if (newAssignee?.role === 'admin' || newAssignee?.role === 'virtual_assistant') {
          return NextResponse.json(
            { error: "Tasks cannot be assigned to admins or virtual assistants" },
            { status: 400 }
          )
        }
      }
    } else if (userRole === 'virtual_assistant') {
      // VA can only update tasks assigned to team members
      const assigneeRole = existingTask.assignee?.role
      if (!ASSIGNABLE_ROLES.includes(assigneeRole)) {
        return NextResponse.json(
          { error: "You can only edit tasks assigned to team members" },
          { status: 403 }
        )
      }

      // If VA is changing the assignee, must be to a team member
      if (body.assigned_to && body.assigned_to !== existingTask.assigned_to) {
        const { data: newAssignee } = await admin
          .from("profiles")
          .select("role")
          .eq("id", body.assigned_to)
          .single()

        if (!ASSIGNABLE_ROLES.includes(newAssignee?.role)) {
          return NextResponse.json(
            { error: "You can only assign tasks to team members" },
            { status: 400 }
          )
        }
      }

      // Log activity for admin notification (VA edit takes effect immediately)
      await admin.from("activity_logs").insert({
        actor_user_id: user.id,
        action: "task_edited_by_va",
        entity_type: "task",
        entity_id: id,
        metadata: {
          task_title: existingTask.title,
          edited_by: profile?.full_name,
          changes: Object.keys(body)
        }
      })
    } else if (ASSIGNABLE_ROLES.includes(userRole)) {
      // Team members can only complete their own tasks
      if (existingTask.assigned_to !== user.id) {
        return NextResponse.json(
          { error: "You can only update your own tasks" },
          { status: 403 }
        )
      }

      // Team members can only update status, completion_notes, completed_at, time_allocated
      const allowedFields = ['status', 'completion_notes', 'completed_at', 'time_allocated']
      const attemptedFields = Object.keys(body)
      const disallowedFields = attemptedFields.filter(f => !allowedFields.includes(f))

      if (disallowedFields.length > 0) {
        return NextResponse.json(
          { error: `You can only update: ${allowedFields.join(', ')}` },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Task Completion Logic
    if (body.status === 'completed') {
       if (body.time_allocated === undefined || body.time_allocated === null) {
          if (!existingTask.time_allocated) {
              return NextResponse.json({ error: "Time allocated is required when completing a task." }, { status: 400 })
          }
       }
    }

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden (Admin only)" }, { status: 403 })
    }

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
