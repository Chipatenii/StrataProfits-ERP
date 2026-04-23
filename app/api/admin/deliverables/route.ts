import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// Allowlist of fields that can be updated on a deliverable.
// Excludes server-managed fields like id, invoice_id, created_at, project_id.
const updateDeliverableSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(["pending", "in_progress", "completed", "approved"]).optional(),
    approval_status: z.enum(["pending", "approved", "rejected"]).optional(),
    due_date: z.string().optional().nullable(),
    total_price: z.number().min(0).optional(),
    sort_order: z.number().int().optional(),
    is_default: z.boolean().optional(),
    template_id: z.string().uuid().optional().nullable(),
})

// Admins/VAs only for modifications, others for GET
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const admin = await createAdminClient()
        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get("project_id")

        let query = admin.from("deliverables").select("*")
        if (projectId) {
            query = query.eq("project_id", projectId)
        }

        const { data, error } = await query.order("sort_order", { ascending: true })
        if (error) throw error

        return NextResponse.json(data || [])
    } catch (error) {
        console.error("Error fetching deliverables:", error)
        return NextResponse.json({ error: "Failed to fetch deliverables" }, { status: 500 })
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

        if (profile?.role !== 'admin' && profile?.role !== 'virtual_assistant') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()

        // Extract and ensure fields match expectation
        const { total_price, billing_type, template_id, ...rest } = body

        // 1. Create Deliverable
        const { data: deliverable, error: createError } = await admin
            .from("deliverables")
            .insert({
                ...rest,
                total_price: total_price || 0,
                billing_type: billing_type || 'fixed'
            })
            .select()
            .single()

        if (createError) throw createError

        // 2. If template_id provided, create tasks
        if (template_id && deliverable) {
            const { data: templateItems, error: itemsError } = await admin
                .from("task_template_items")
                .select("*")
                .eq("template_id", template_id)
                .order("order_index", { ascending: true })

            if (itemsError) {
                console.error("Error fetching template items:", itemsError)
            } else if (templateItems && templateItems.length > 0) {
                const tasksToCreate = templateItems.map(item => ({
                    project_id: deliverable.project_id,
                    deliverable_id: deliverable.id,
                    title: item.name,
                    description: item.description,
                    estimated_hours: item.default_estimated_hours || 0,
                    status: 'pending',
                    priority: 'medium'
                }))

                const { error: tasksError } = await admin
                    .from("tasks")
                    .insert(tasksToCreate)

                if (tasksError) {
                    console.error("Error creating tasks from template:", tasksError)
                }
            }
        }

        return NextResponse.json(deliverable)
    } catch (error) {
        console.error("Error creating deliverable:", error)
        return NextResponse.json({ error: "Failed to create deliverable" }, { status: 500 })
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
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        if (profile?.role !== 'admin' && profile?.role !== 'virtual_assistant') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

        const body = await request.json()

        const validation = updateDeliverableSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.format() },
                { status: 400 }
            )
        }

        const { data, error } = await admin
            .from("deliverables")
            .update(validation.data)
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error("Error updating deliverable:", error)
        return NextResponse.json({ error: "Failed to update deliverable" }, { status: 500 })
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

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

        // 1. Fetch the deliverable to check if it's default and get its project_id
        const { data: deliverable, error: fetchError } = await admin
            .from("deliverables")
            .select("project_id, is_default")
            .eq("id", id)
            .single()

        if (fetchError || !deliverable) {
            return NextResponse.json({ error: "Deliverable not found" }, { status: 404 })
        }

        // 2. Prevent deleting the default deliverable
        if (deliverable.is_default) {
            return NextResponse.json(
                { error: "Cannot delete the default deliverable. Every project must have at least one default deliverable." },
                { status: 409 }
            )
        }

        // 3. Find the default deliverable for this project to reassign tasks
        const { data: defaultDeliverable, error: defaultError } = await admin
            .from("deliverables")
            .select("id")
            .eq("project_id", deliverable.project_id)
            .eq("is_default", true)
            .single()

        if (defaultError || !defaultDeliverable) {
            return NextResponse.json({ error: "Default project deliverable not found for reassignment" }, { status: 500 })
        }

        // 4. Reassign tasks to the default deliverable
        const { error: updateError } = await admin
            .from("tasks")
            .update({ deliverable_id: defaultDeliverable.id })
            .eq("deliverable_id", id)

        if (updateError) throw updateError

        // 5. Delete the deliverable
        const { error: deleteError } = await admin.from("deliverables").delete().eq("id", id)
        if (deleteError) throw deleteError

        return NextResponse.json({ success: true, message: "Deliverable deleted and tasks reassigned to default" })
    } catch (error) {
        console.error("Error deleting deliverable:", error)
        return NextResponse.json({ error: "Failed to delete deliverable" }, { status: 500 })
    }
}
