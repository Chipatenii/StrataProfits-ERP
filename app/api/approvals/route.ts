import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { logActivity } from "@/lib/audit"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

const createApprovalSchema = z.object({
    // FIX: remove 'invoice' and 'quote' — no approval_status column exists on those tables; keep meeting now that it's handled below
    entity_type: z.enum(['task', 'time_log', 'expense', 'meeting', 'deliverable']),
    entity_id: z.string().uuid(),
    assigned_to_user_id: z.string().uuid().optional(),
    assigned_role: z.string().optional() // e.g. 'admin'
})

const updateApprovalSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(['approved', 'rejected']),
    decision_note: z.string().optional()
})

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Fetch pending approvals assigned to this user OR their role
    // This requires knowing the user's role.
    const admin = await createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    const userRole = profile?.role || 'team_member'

    // Logic: fetch requests where assigned_to = ME or assigned_role = MY_ROLE
    const { data, error } = await admin
        .from("approval_requests")
        .select("*, requester:profiles!requested_by_user_id(full_name)")
        .or(`assigned_to_user_id.eq.${user.id},assigned_role.eq.${userRole}`)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching approvals:", error)
        return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 })
    }

    return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const validation = createApprovalSchema.safeParse(body)

    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed" }, { status: 400 })
    }

    const admin = await createAdminClient()
    const { data, error } = await admin.from("approval_requests").insert({
        ...validation.data,
        requested_by_user_id: user.id
    }).select().single()

    if (error) {
        return NextResponse.json({ error: "Failed to create approval request" }, { status: 500 })
    }

    await logActivity(user.id, "REQUEST_APPROVAL", validation.data.entity_type, validation.data.entity_id, { requestId: data.id })

    return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const validation = updateApprovalSchema.safeParse(body)

    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed" }, { status: 400 })
    }

    const { id, status, decision_note } = validation.data
    const admin = await createAdminClient()

    // Verify permission (can this user approve this?)
    const { data: requestRecord } = await admin.from("approval_requests").select("*").eq("id", id).single()

    if (!requestRecord) return NextResponse.json({ error: "Request not found" }, { status: 404 })

    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    const userRole = profile?.role || 'team_member'

    const isAssignee = requestRecord.assigned_to_user_id === user.id
    const hasAssignedRole = requestRecord.assigned_role === userRole
    const isAdmin = userRole === 'admin'

    if (!isAssignee && !hasAssignedRole && !isAdmin) {
        return NextResponse.json({ error: "Forbidden: Not assigned to you" }, { status: 403 })
    }

    const { data, error } = await admin
        .from("approval_requests")
        .update({
            status,
            decision_note,
            decided_by_user_id: user.id,
            decided_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: "Failed to update approval" }, { status: 500 })
    }

    // SYNC Logic: Update the original entity status if needed (ERP requirement: "keep tasks.approval_status in sync")
    if (status === 'approved' || status === 'rejected') {
        const entityTable = getTableForEntity(requestRecord.entity_type)
        if (entityTable) {
            // Mapping for compatibility
            let updatePayload: any = {}
            if (requestRecord.entity_type === 'task') {
                updatePayload.approval_status = status
            } else if (requestRecord.entity_type === 'expense') {
                updatePayload.status = status === 'approved' ? 'Approved' : 'Rejected'
            } else if (requestRecord.entity_type === 'time_log') {
                updatePayload.is_approved = status === 'approved'
            } else if (requestRecord.entity_type === 'deliverable') {
                updatePayload.approval_status = status
            // FIX: sync meetings.status on approval/rejection — was previously silently skipped
            } else if (requestRecord.entity_type === 'meeting') {
                updatePayload.status = status === 'approved' ? 'Approved' : 'Rejected'
            }

            if (Object.keys(updatePayload).length > 0) {
                await admin.from(entityTable).update(updatePayload).eq("id", requestRecord.entity_id)
            }
        }
    }

    await logActivity(user.id, `DECISION_${status.toUpperCase()}`, requestRecord.entity_type, requestRecord.entity_id, { requestId: id })

    return NextResponse.json(data)
}

function getTableForEntity(type: string) {
    switch (type) {
        case 'task': return 'tasks'
        case 'time_log': return 'time_logs'
        case 'expense': return 'expenses'
        case 'deliverable': return 'deliverables'
        // FIX: add meeting so its status column gets synced
        case 'meeting': return 'meetings'
        default: return null
    }
}
