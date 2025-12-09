import { createAdminClient } from "@/lib/supabase/admin"
import { createProjectSchema } from "@/lib/schemas"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await createAdminClient()
        const { id } = await params

        const { data: project, error } = await admin
            .from("projects")
            .select(`
        *,
        members:project_members(
            id,
            user_id,
            role,
            joined_at,
            profile:profiles(full_name, email, role, avatar_url)
        ),
        tasks(*)
      `)
            .eq("id", id)
            .single()

        if (error) throw error

        return NextResponse.json(project)
    } catch (error) {
        console.error("Error fetching project:", error)
        return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await createAdminClient()
        const { id } = await params
        const body = await request.json()

        // Validate (partial)
        const validation = createProjectSchema.partial().safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.format() },
                { status: 400 }
            )
        }

        const { data: project, error } = await admin
            .from("projects")
            .update(validation.data)
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(project)
    } catch (error) {
        console.error("Error updating project:", error)
        return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await createAdminClient()
        const { id } = await params

        const { error } = await admin.from("projects").delete().eq("id", id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting project:", error)
        return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
    }
}
