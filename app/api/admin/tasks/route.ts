import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { APP_CONFIG } from "@/lib/config"
import { createTaskSchema } from "@/lib/schemas"
import { getEmailForUser, sendTaskAssignedEmail } from "@/lib/email"

// Roles a non-admin caller can assign tasks to (i.e. anyone non-admin).
// Admins cannot be assigned tasks. VAs CAN be assigned tasks (by themselves,
// other VAs, or admins).
const ASSIGNABLE_ROLES = ['team_member', 'developer', 'social_media_manager', 'book_keeper', 'marketing', 'sales', 'graphic_designer', 'virtual_assistant']

// Helper: replace the task_assignees rows for a task with the given user ids.
// Existing rows for this task are deleted first so this is idempotent.
async function syncTaskAssignees(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  taskId: string,
  userIds: string[]
) {
  const unique = Array.from(new Set(userIds.filter(Boolean)))
  await admin.from("task_assignees").delete().eq("task_id", taskId)
  if (unique.length === 0) return
  const rows = unique.map((user_id) => ({ task_id: taskId, user_id }))
  const { error } = await admin.from("task_assignees").insert(rows)
  if (error) console.error("[syncTaskAssignees] insert failed:", error)
}

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

    // Helper to attach assignee_ids[] from the task_assignees junction table.
    const withAssignees = async (
      tasks: Array<Record<string, unknown> & { id: string }> | null
    ) => {
      if (!tasks || tasks.length === 0) return []
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
      return tasks.map((t) => ({ ...t, assignee_ids: grouped.get(t.id) || [] }))
    }

    if (userRole === 'admin') {
      // Admin sees all tasks
      const { data: tasks, error } = await admin
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      return NextResponse.json(await withAssignees(tasks))
    }

    if (userRole === 'virtual_assistant') {
      // VA sees only:
      //   1. Tasks assigned directly to this VA (primary or secondary)
      //   2. Tasks this VA has created/assigned to others
      // This prevents cross-VA data leakage.
      const { data: extraIds } = await admin
        .from("task_assignees")
        .select("task_id")
        .eq("user_id", user.id)
      const extraTaskIds = (extraIds || []).map((r) => r.task_id)
      const orFilter = [
        `assigned_to.eq.${user.id}`,
        `created_by.eq.${user.id}`,
        ...(extraTaskIds.length > 0 ? [`id.in.(${extraTaskIds.join(",")})`] : []),
      ].join(",")
      const { data: tasks, error } = await admin
        .from("tasks")
        .select("*")
        .or(orFilter)
        .order("created_at", { ascending: false })

      if (error) throw error
      return NextResponse.json(await withAssignees(tasks))
    }

    // Team members and other roles: see only their own tasks (incl. ones they're a secondary assignee on)
    const { data: extraIds } = await admin
      .from("task_assignees")
      .select("task_id")
      .eq("user_id", user.id)
    const extraTaskIds = (extraIds || []).map((r) => r.task_id)
    const orFilter = [
      `assigned_to.eq.${user.id}`,
      `created_by.eq.${user.id}`,
      ...(extraTaskIds.length > 0 ? [`id.in.(${extraTaskIds.join(",")})`] : []),
    ].join(",")
    const { data: tasks, error } = await admin
      .from("tasks")
      .select("*")
      .or(orFilter)
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json(await withAssignees(tasks))
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

    // Build the full assignee list (primary + extras). The primary
    // (`assigned_to`) is kept for backward compatibility with all the
    // dashboards that count tasks per single user; extras live in
    // `task_assignees`.
    const requestedAssigneeIds: string[] = []
    if (validation.data.assigned_to) requestedAssigneeIds.push(validation.data.assigned_to)
    if (Array.isArray(validation.data.assignee_ids)) {
      for (const id of validation.data.assignee_ids) {
        if (!requestedAssigneeIds.includes(id)) requestedAssigneeIds.push(id)
      }
    }

    // Validate every assignee role: nobody can assign tasks to admins.
    if (requestedAssigneeIds.length > 0) {
      const { data: assigneeProfiles } = await admin
        .from("profiles")
        .select("id, role")
        .in("id", requestedAssigneeIds)

      const profilesById = new Map(
        (assigneeProfiles || []).map((p) => [p.id, p.role])
      )

      for (const id of requestedAssigneeIds) {
        const role = profilesById.get(id)
        if (!role) {
          return NextResponse.json(
            { error: "One or more assignees were not found" },
            { status: 400 }
          )
        }
        if (role === 'admin') {
          return NextResponse.json(
            { error: "Tasks cannot be assigned to admins" },
            { status: 400 }
          )
        }
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
    let finalAssignedTo = requestedAssigneeIds[0] ?? validation.data.assigned_to ?? null
    let finalAssigneeIds = requestedAssigneeIds

    if (userRole === 'team_member' || (ASSIGNABLE_ROLES.includes(userRole) && userRole !== 'virtual_assistant')) {
      // Team members can only create tasks assigned to themselves
      finalAssignedTo = user.id
      finalAssigneeIds = [user.id]
      if (finalStatus !== 'pending_approval') {
        finalStatus = 'pending_approval'
      }
    } else if (userRole === 'virtual_assistant') {
      // VA can assign to anyone non-admin (including themselves and other VAs).
      // Tasks created by a VA still default to pending_approval for the admin to verify.
      if (finalStatus !== 'pending_approval') {
        finalStatus = 'pending_approval'
      }
    }

    // Strip the API-only `assignee_ids` field before inserting into tasks.
    const { assignee_ids: _ignoredAssigneeIds, ...validatedRest } = validation.data
    void _ignoredAssigneeIds
    const taskData = {
      ...validatedRest,
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
      .single()

    if (error) throw error

    // Persist the full assignee set (primary + extras) into the junction table.
    if (task?.id) {
      await syncTaskAssignees(admin, task.id, finalAssigneeIds)
    }

    // Fire-and-forget: notify every assignee.
    if (finalAssigneeIds.length > 0) {
      (async () => {
        try {
          const { data: assignerProfile } = await admin
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single()

          let projectName: string | null = null
          if (taskData.project_id) {
            const { data: project } = await admin
              .from("projects")
              .select("name")
              .eq("id", taskData.project_id)
              .single()
            projectName = project?.name ?? null
          }

          const { data: assigneeProfiles } = await admin
            .from("profiles")
            .select("id, full_name")
            .in("id", finalAssigneeIds)
          const nameById = new Map(
            (assigneeProfiles || []).map((p) => [p.id, p.full_name])
          )

          await Promise.all(
            finalAssigneeIds.map(async (assigneeId) => {
              const recipientEmail = await getEmailForUser(assigneeId)
              if (!recipientEmail) return
              await sendTaskAssignedEmail({
                recipientEmail,
                recipientName: nameById.get(assigneeId) ?? "Team Member",
                taskTitle: taskData.title ?? "Untitled Task",
                projectName,
                assignedByName: assignerProfile?.full_name ?? null,
              })
            })
          )
        } catch (emailErr) {
          console.error("[Tasks POST] Email notification failed:", emailErr)
        }
      })()
    }

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

    // Sanitize empty strings to null for UUID/FK fields
    if (body.assigned_to === '') body.assigned_to = null
    if (body.project_id === '') body.project_id = null
    if (body.deliverable_id === '') body.deliverable_id = null

    // Get existing task — separate from assignee profile to avoid FK join failure
    const { data: existingTask, error: taskFetchError } = await admin
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single()

    if (taskFetchError || !existingTask) {
      console.error("[PATCH /api/admin/tasks] Task not found:", id, taskFetchError)
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Role-based update permissions:
    // - Admin: can update any task
    // - VA: can update tasks assigned to team members only (not admin/VA tasks)
    // - Team members: can only update status to "completed" on their own tasks

    // Build the requested set of assignees from any combination of fields the
    // client sent (single primary, multi-select array, or both).
    const assigneeIdsField: string[] | undefined = Array.isArray(body.assignee_ids)
      ? body.assignee_ids.filter((x: unknown): x is string => typeof x === "string")
      : undefined
    const requestedAssigneeIds: string[] = []
    if (typeof body.assigned_to === "string" && body.assigned_to) {
      requestedAssigneeIds.push(body.assigned_to)
    }
    if (assigneeIdsField) {
      for (const id of assigneeIdsField) {
        if (!requestedAssigneeIds.includes(id)) requestedAssigneeIds.push(id)
      }
    }

    if (userRole === 'admin') {
      // Admin can assign to anyone except other admins
      if (requestedAssigneeIds.length > 0) {
        const { data: newAssignees } = await admin
          .from("profiles")
          .select("id, role")
          .in("id", requestedAssigneeIds)
        if ((newAssignees || []).some((a) => a.role === 'admin')) {
          return NextResponse.json(
            { error: "Tasks cannot be assigned to admins" },
            { status: 400 }
          )
        }
      }
    } else if (userRole === 'virtual_assistant') {
      const vaIsCreator = existingTask.created_by === user.id
      const vaIsAssignee = existingTask.assigned_to === user.id

      if (!vaIsCreator && !vaIsAssignee) {
        return NextResponse.json(
          { error: "You can only edit tasks you have assigned or that are assigned to you" },
          { status: 403 }
        )
      }

      if (vaIsCreator) {
        // Full edit rights for the VA who created the task. They can assign
        // to anyone non-admin (including themselves and other VAs).
        if (requestedAssigneeIds.length > 0) {
          const { data: newAssignees } = await admin
            .from("profiles")
            .select("id, role")
            .in("id", requestedAssigneeIds)

          for (const a of newAssignees || []) {
            if (a.role === 'admin') {
              return NextResponse.json(
                { error: "Tasks cannot be assigned to admins" },
                { status: 400 }
              )
            }
          }
        }

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
      } else {
        // VA is the assignee (task was assigned TO them): only allow completion fields
        const allowedFields = ['status', 'completion_notes', 'completed_at', 'time_allocated']
        const disallowedFields = Object.keys(body).filter(f => !allowedFields.includes(f))

        if (disallowedFields.length > 0) {
          return NextResponse.json(
            { error: `As an assignee you can only update: ${allowedFields.join(', ')}` },
            { status: 403 }
          )
        }
      }
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

       // Hardening: cap claimed time. Anyone other than admin/VA must stay under
       // max(estimate * 3, 8h). Admins/VAs can go over (treated as override).
       const claimed = typeof body.time_allocated === 'number'
         ? body.time_allocated
         : (typeof existingTask.time_allocated === 'number' ? existingTask.time_allocated : 0)
       const estimate = typeof existingTask.estimated_hours === 'number'
         ? existingTask.estimated_hours
         : 0
       const cap = Math.max(estimate * 3, 8)
       const isPrivileged = userRole === 'admin' || userRole === 'virtual_assistant'
       if (!isPrivileged && claimed > cap) {
         return NextResponse.json(
           {
             error: `Claimed time (${claimed.toFixed(2)}h) exceeds the cap of ${cap.toFixed(1)}h for this task. Ask an admin to log time above the cap.`,
           },
           { status: 400 }
         )
       }
    }

    // Strip the API-only `assignee_ids` field from the row update; persist
    // it via the junction table below.
    const { assignee_ids: _patchAssigneeIds, ...updateBody } = body
    void _patchAssigneeIds

    // If the caller sent any assignee fields and this caller is allowed to
    // change them (admin or VA-as-creator), make the primary `assigned_to`
    // match the first item in the list so the legacy column stays in sync.
    const callerCanReassign =
      userRole === 'admin' ||
      (userRole === 'virtual_assistant' && existingTask.created_by === user.id)
    if (callerCanReassign && (assigneeIdsField || typeof body.assigned_to === "string")) {
      updateBody.assigned_to = requestedAssigneeIds[0] ?? null
    }

    const { data: task, error } = await admin
      .from("tasks")
      .update(updateBody)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    // Sync the junction table when the caller actually edited the assignee
    // list. We only touch it if `assignee_ids` was passed (multi-select) or
    // when `assigned_to` was the only field changed.
    if (callerCanReassign && (assigneeIdsField || typeof body.assigned_to === "string")) {
      await syncTaskAssignees(admin, id, requestedAssigneeIds)
    }

    // Back-fill a time_logs entry on completion if the assignee never ran
    // a timer. Without this, tasks completed manually never contribute to
    // the workforce/payroll reports (which aggregate from time_logs).
    if (body.status === 'completed') {
      const allocatedHours = typeof body.time_allocated === 'number'
        ? body.time_allocated
        : (typeof existingTask.time_allocated === 'number' ? existingTask.time_allocated : null)

      if (allocatedHours && allocatedHours > 0) {
        // The "owner" of the work: prefer the user calling PATCH if they are
        // an assignee (covers self-completion). Otherwise fall back to the
        // task's primary assignee (admin/VA completing on behalf).
        const taskAssigneeIds = new Set<string>()
        if (task?.assigned_to) taskAssigneeIds.add(task.assigned_to)
        const { data: assigneeLinks } = await admin
          .from("task_assignees")
          .select("user_id")
          .eq("task_id", id)
        ;(assigneeLinks || []).forEach((l) => taskAssigneeIds.add(l.user_id))

        const ownerId = taskAssigneeIds.has(user.id) ? user.id : (task?.assigned_to ?? null)

        if (ownerId) {
          const allocatedMinutes = Math.round(allocatedHours * 60)
          const { data: existingLogs } = await admin
            .from("time_logs")
            .select("duration_minutes")
            .eq("task_id", id)
            .eq("user_id", ownerId)

          const loggedMinutes = (existingLogs || []).reduce(
            (sum, l: any) => sum + (l.duration_minutes || 0),
            0
          )
          const gap = allocatedMinutes - loggedMinutes

          if (gap > 0) {
            const completedAt = body.completed_at
              ? new Date(body.completed_at)
              : new Date()
            const clockOut = completedAt.toISOString()
            const clockIn = new Date(completedAt.getTime() - gap * 60_000).toISOString()
            // Back-filled rows are NOT approved/billable until an admin
            // verifies the task. `verifyTask` flips both flags to true.
            await admin.from("time_logs").insert({
              user_id: ownerId,
              task_id: id,
              clock_in: clockIn,
              clock_out: clockOut,
              duration_minutes: gap,
              is_approved: false,
              billable: false,
            })
          }
        }
      }
    }

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
