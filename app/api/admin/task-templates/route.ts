import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const admin = await createAdminClient()

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
