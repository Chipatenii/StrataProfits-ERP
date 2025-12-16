import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const admin = await createAdminClient()

        const { data: projects, error } = await admin
            .from("projects")
            .select("id, name, status")
            .eq("status", "active")
            .order("name", { ascending: true })

        if (error) throw error

        return NextResponse.json(projects || [])
    } catch (error) {
        console.error("Error fetching projects:", error)
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
    }
}
