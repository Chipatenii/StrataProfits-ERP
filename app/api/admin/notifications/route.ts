import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const adminId = searchParams.get("adminId")

        if (!adminId) {
            return NextResponse.json({ error: "Admin ID required" }, { status: 400 })
        }

        const supabase = await createAdminClient()

        // Get unread notifications
        const { data: notifications, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("admin_id", adminId)
            .eq("is_read", false)
            .order("created_at", { ascending: false })
            .limit(50)

        if (error) {
            console.error("Error fetching notifications:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(notifications || [])
    } catch (error) {
        console.error("Error in notifications GET:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json()
        const { notificationId, adminId, markAllRead } = body

        const supabase = await createAdminClient()

        if (markAllRead && adminId) {
            // Mark all notifications as read for this admin
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("admin_id", adminId)
                .eq("is_read", false)

            if (error) {
                console.error("Error marking all as read:", error)
                return NextResponse.json({ error: error.message }, { status: 500 })
            }

            return NextResponse.json({ success: true })
        }

        if (notificationId) {
            // Mark single notification as read
            const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)

            if (error) {
                console.error("Error marking notification as read:", error)
                return NextResponse.json({ error: error.message }, { status: 500 })
            }

            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    } catch (error) {
        console.error("Error in notifications PATCH:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const adminId = searchParams.get("adminId")

        if (!adminId) {
            return NextResponse.json({ error: "Admin ID required" }, { status: 400 })
        }

        const supabase = await createAdminClient()

        // Delete old read notifications (older than 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("admin_id", adminId)
            .eq("is_read", true)
            .lt("created_at", thirtyDaysAgo.toISOString())

        if (error) {
            console.error("Error deleting old notifications:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error in notifications DELETE:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
