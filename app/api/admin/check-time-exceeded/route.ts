import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

/**
 * API endpoint to check for tasks exceeding time estimates
 * This should be called periodically (e.g., every hour via cron job)
 */
export async function POST(request: Request) {
    try {
        const supabase = await createAdminClient()

        // Call the database function to check time exceeded
        const { error } = await supabase.rpc("check_time_exceeded")

        if (error) {
            console.error("Error checking time exceeded:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: "Time check completed" })
    } catch (error) {
        console.error("Error in check-time-exceeded POST:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
