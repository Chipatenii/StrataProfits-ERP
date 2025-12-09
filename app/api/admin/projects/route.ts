import { createAdminClient } from "@/lib/supabase/admin"
import { createProjectSchema } from "@/lib/schemas"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const admin = await createAdminClient()

        // Fetch all projects
        const { data: projects, error } = await admin
            .from("projects")
            .select(`
        *,
        tasks:tasks(count),
        members:project_members(count)
      `)
            .order("created_at", { ascending: false })

        if (error) throw error

        return NextResponse.json(projects || [])
    } catch (error) {
        console.error("Error fetching projects:", error)
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const admin = await createAdminClient()
        const body = await request.json()

        const validation = createProjectSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.format() },
                { status: 400 }
            )
        }

        const { data: project, error } = await admin
            .from("projects")
            .insert(validation.data)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(project)
    } catch (error) {
        console.error("Error creating project:", error)
        return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
    }
}
