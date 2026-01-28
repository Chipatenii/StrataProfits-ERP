import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        if (profile?.role !== 'admin' && profile?.role !== 'book_keeper') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Fetch all time logs
        const { data: logs, error } = await admin
            .from("time_logs")
            .select("*")
            .order("clock_in", { ascending: false })

        if (error) throw error

        return NextResponse.json(logs || [])
    } catch (error) {
        console.error("Error fetching time logs:", error)
        return NextResponse.json({ error: "Failed to fetch time logs" }, { status: 500 })
    }
}
