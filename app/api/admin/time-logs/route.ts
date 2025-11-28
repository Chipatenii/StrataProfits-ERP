import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
    try {
        const admin = await createAdminClient()

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
