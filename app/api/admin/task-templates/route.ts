import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
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

        // Fetch all active task templates
        const { data: templates, error } = await admin
            .from("task_templates")
            .select(`
                *,
                items:task_template_items(*)
            `)
            .eq("is_active", true)
            .order("name", { ascending: true })

        if (error) throw error

        return NextResponse.json(templates || [])
    } catch (error) {
        console.error("Error fetching task templates:", error)
        return NextResponse.json({ error: "Failed to fetch task templates" }, { status: 500 })
    }
}
