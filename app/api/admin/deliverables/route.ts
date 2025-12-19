import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// Admins only
export async function GET(request: NextRequest) {
    try {
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
        const admin = await createAdminClient()
        const body = await request.json()

        const { data, error } = await admin
            .from("deliverables")
            .insert(body)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error("Error creating deliverable:", error)
        return NextResponse.json({ error: "Failed to create deliverable" }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const admin = await createAdminClient()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

        const body = await request.json()
        const { data, error } = await admin
            .from("deliverables")
            .update(body)
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
        const admin = await createAdminClient()
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
