import { createAdminClient } from "@/lib/supabase/admin"

// Canonical table name used throughout the codebase.
// Note: /api/activity also writes to this same table under the column "user_id"
// whereas this function uses "actor_user_id".  Both point to the same table.
const AUDIT_TABLE = "activity_logs" as const

export async function logActivity(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>
) {
    try {
        const admin = await createAdminClient()
        await admin.from(AUDIT_TABLE).insert({
            actor_user_id: actorId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            metadata: metadata ?? {},
        })
    } catch (error) {
        // Fail silently — audit failures must never crash the primary flow.
        console.error("Failed to write audit log:", error)
    }
}
