import { createClient } from "@/lib/supabase/server"
import { Task } from "@/lib/types"

export async function getTasks(filters?: {
    projectId?: string
    assignedTo?: string
    status?: string
    limit?: number
}) {
    const supabase = await createClient()

    let query = supabase
        .from("tasks")
        .select("*, project:projects(name), assignee:profiles!assigned_to(full_name)")
        .order("due_date", { ascending: true })

    if (filters?.projectId) {
        query = query.eq("project_id", filters.projectId)
    }
    if (filters?.assignedTo) {
        query = query.eq("assigned_to", filters.assignedTo)
    }
    if (filters?.status) {
        query = query.eq("status", filters.status)
    }
    if (filters?.limit) {
        query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
        console.error("Error fetching tasks:", error)
        return []
    }

    return data as any[] // utilizing loose typing for joined fields for now or need to extend Task type in response
}

export async function getTaskById(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("tasks")
        .select("*, project:projects(*)")
        .eq("id", id)
        .single()

    if (error) {
        console.error(`Error fetching task ${id}:`, error)
        return null
    }
    return data as Task
}

export async function getMyTasks() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    return getTasks({ assignedTo: user.id })
}
