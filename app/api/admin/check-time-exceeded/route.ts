import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * API endpoint to check for tasks exceeding time estimates
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: "Forbidden (Admin only)" }, { status: 403 })
        }

        // Call the database function to check time exceeded
        const { error } = await admin.rpc("check_time_exceeded")

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
