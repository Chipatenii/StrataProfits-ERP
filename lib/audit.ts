import { createAdminClient } from "@/lib/supabase/admin"

export async function logActivity(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: any
) {
    try {
        const admin = await createAdminClient()
        await admin.from("activity_logs").insert({
            actor_user_id: actorId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            metadata
        })
    } catch (error) {
        // Fail silently or log to system output, don't crash main flow
        console.error("Failed to write audit log:", error)
    }
}
