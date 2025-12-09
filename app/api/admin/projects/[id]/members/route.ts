import { createAdminClient } from "@/lib/supabase/admin"
import { addProjectMemberSchema } from "@/lib/schemas"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await createAdminClient()
        const { id: projectId } = await params
        const body = await request.json()

        const validation = addProjectMemberSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.format() },
                { status: 400 }
            )
        }

        const { data: member, error } = await admin
            .from("project_members")
            .insert({
                project_id: projectId,
                user_id: validation.data.userId,
                role: validation.data.role,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(member)
    } catch (error) {
        console.error("Error adding project member:", error)
        // Handle unique violation (duplicate member)
        if ((error as any)?.code === "23505") {
            return NextResponse.json({ error: "User is already a member of this project" }, { status: 409 })
        }
        return NextResponse.json({ error: "Failed to add project member" }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await createAdminClient()
        const { id: projectId } = await params
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get("userId")

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 })
        }

        const { error } = await admin
            .from("project_members")
            .delete()
            .match({ project_id: projectId, user_id: userId })

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error removing project member:", error)
        return NextResponse.json({ error: "Failed to remove project member" }, { status: 500 })
    }
}
