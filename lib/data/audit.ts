import { createClient } from "@/lib/supabase/server"

export type AuditAction =
    | "create" | "update" | "delete"
    | "approve" | "reject"
    | "send" | "mark_paid"
    | "login" | "logout"

export interface LogActivityParams {
    action: AuditAction
    entityType: string
    entityId?: string
    metadata?: Record<string, any>
}

export async function logActivity(params: LogActivityParams) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from("activity_logs").insert({
        actor_user_id: user?.id,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        metadata: params.metadata,
    })

    if (error) {
        console.error("Failed to log activity:", error)
    }
}

export async function getActivityLogs(filters?: {
    entityType?: string
    entityId?: string
    limit?: number
}) {
    const supabase = await createClient()

    let query = supabase
        .from("activity_logs")
        .select("*, actor:profiles!actor_user_id(full_name)")
        .order("created_at", { ascending: false })

    if (filters?.entityType) {
        query = query.eq("entity_type", filters.entityType)
    }
    if (filters?.entityId) {
        query = query.eq("entity_id", filters.entityId)
    }
    if (filters?.limit) {
        query = query.limit(filters.limit)
    }

    const { data, error } = await query
    if (error) {
        console.error("Error fetching activity logs:", error)
        return []
    }
    return data
}
