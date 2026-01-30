"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createSelfTaskSchema } from "@/lib/schemas"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function createSelfCreatedTask(data: z.infer<typeof createSelfTaskSchema>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: "Unauthorized" }
    }

    const validation = createSelfTaskSchema.safeParse(data)
    if (!validation.success) {
        return { error: "Validation failed", details: validation.error.format() }
    }

    const { title, description, project_id, due_date, estimated_hours, priority, is_project_related } = validation.data

    // If not project related, ensure project_id is null
    const finalProjectId = is_project_related ? project_id : null

    // Use admin client to bypass potential RLS recursion on insert
    const admin = await createAdminClient()

    const { data: task, error } = await admin
        .from("tasks")
        .insert({
            title,
            description,
            project_id: finalProjectId,
            due_date,
            estimated_hours,
            priority,
            created_by: user.id,
            assigned_to: user.id, // Assign to self
            is_self_created: true,
            approval_status: "pending",
            status: "pending" // Initial status of the task work itself
        })
        .select()
        .single()

    if (error) {
        console.error("Error creating self task:", error)
        return { error: "Failed to create task" }
    }

    revalidatePath("/dashboard")
    return { success: true, task }
}

export async function approveTask(taskId: string) {
    const supabase = await createClient() // Use normal client, but check admin role
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: "Unauthorized" }

    // Check admin role
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") {
        console.warn("Non-admin user tried to approve task:", user.id)
        return { error: "Forbidden" }
    }

    console.log("Approving task:", taskId, "requested by:", user.id)
    const admin = await createAdminClient()

    const { error } = await admin
        .from("tasks")
        .update({
            approval_status: "approved",
            approved_by: user.id,
            approved_at: new Date().toISOString()
        })
        .eq("id", taskId)

    if (error) {
        console.error("Error approving task:", error)
        return { error: "Failed to approve task" }
    }
    console.log("Successfully approved task:", taskId)

    // Trigger ensures time_logs are updated, but we can double check or let trigger handle it.
    // The migration trigger 'handle_task_approval_update' should handle it.

    revalidatePath("/dashboard")
    return { success: true }
}

export async function rejectTask(taskId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: "Unauthorized" }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") {
        return { error: "Forbidden" }
    }

    const admin = await createAdminClient()

    const { error } = await admin
        .from("tasks")
        .update({
            approval_status: "rejected",
            approved_by: user.id,
            approved_at: new Date().toISOString()
        })
        .eq("id", taskId)

    if (error) {
        console.error("Error rejecting task:", error)
        return { error: "Failed to reject task" }
    }

    revalidatePath("/dashboard")
    return { success: true }
}

export async function updateSelfCreatedTask(taskId: string, data: {
    title?: string
    description?: string | null
    project_id?: string | null
    due_date?: string | null
    estimated_hours?: number | null
    priority?: "low" | "medium" | "high"
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: "Unauthorized" }

    // Ensure user owns the task
    const { data: task } = await supabase.from("tasks").select("created_by, is_self_created").eq("id", taskId).single()
    if (!task || task.created_by !== user.id || !task.is_self_created) {
        return { error: "Permission denied" }
    }

    const { title, description, project_id, due_date, estimated_hours, priority } = data

    const admin = await createAdminClient()
    const { error } = await admin
        .from("tasks")
        .update({
            title,
            description,
            project_id,
            due_date,
            estimated_hours,
            priority,
            updated_at: new Date().toISOString()
        })
        .eq("id", taskId)

    if (error) {
        console.error("Error updating self task:", error)
        return { error: "Failed to update task" }
    }

    revalidatePath("/dashboard")
    return { success: true }
}

export async function deleteSelfCreatedTask(taskId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: "Unauthorized" }

    // Ensure user owns the task and it's self-created
    const { data: task } = await supabase.from("tasks").select("created_by, is_self_created").eq("id", taskId).single()
    if (!task || task.created_by !== user.id || !task.is_self_created) {
        return { error: "Permission denied" }
    }

    const admin = await createAdminClient()
    const { error } = await admin
        .from("tasks")
        .delete()
        .eq("id", taskId)

    if (error) {
        console.error("Error deleting self task:", error)
        return { error: "Failed to delete task" }
    }

    revalidatePath("/dashboard")
    return { success: true }
}
