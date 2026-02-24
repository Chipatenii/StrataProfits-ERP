import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createProjectSchema } from "@/lib/schemas"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

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
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const admin = await createAdminClient()

        // Role Check
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role !== 'admin' && profile?.role !== 'virtual_assistant') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

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
