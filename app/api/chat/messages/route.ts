import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/chat/messages?channel_id=xxx&limit=50&before=timestamp
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const channelId = searchParams.get("channel_id")
        const limit = parseInt(searchParams.get("limit") || "50")
        const before = searchParams.get("before")

        if (!channelId) return NextResponse.json({ error: "channel_id is required" }, { status: 400 })

        // Verify membership
        const { data: membership } = await supabase
            .from("chat_channel_members")
            .select("id")
            .eq("channel_id", channelId)
            .eq("user_id", user.id)
            .single()

        if (!membership) return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 })

        let query = supabase
            .from("chat_messages")
            .select("*, sender:profiles!chat_messages_sender_id_fkey(id, full_name, avatar_url, role)")
            .eq("channel_id", channelId)
            .order("created_at", { ascending: false })
            .limit(Math.min(limit, 100))

        if (before) query = query.lt("created_at", before)

        const { data, error } = await query
        if (error) throw error

        // Update last_read_at
        await supabase
            .from("chat_channel_members")
            .update({ last_read_at: new Date().toISOString() })
            .eq("channel_id", channelId)
            .eq("user_id", user.id)

        // Return in chronological order
        return NextResponse.json((data || []).reverse())
    } catch (error: any) {
        console.error("GET /api/chat/messages error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST /api/chat/messages — send a message
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const body = await request.json()
        const { channel_id, content, reply_to } = body

        if (!channel_id || !content?.trim()) {
            return NextResponse.json({ error: "channel_id and content are required" }, { status: 400 })
        }

        // Verify membership
        const { data: membership } = await supabase
            .from("chat_channel_members")
            .select("id")
            .eq("channel_id", channel_id)
            .eq("user_id", user.id)
            .single()

        if (!membership) return NextResponse.json({ error: "Not a member of this channel" }, { status: 403 })

        const { data, error } = await supabase
            .from("chat_messages")
            .insert({
                channel_id,
                sender_id: user.id,
                content: content.trim(),
                reply_to: reply_to || null,
            })
            .select("*, sender:profiles!chat_messages_sender_id_fkey(id, full_name, avatar_url, role)")
            .single()

        if (error) throw error

        return NextResponse.json(data, { status: 201 })
    } catch (error: any) {
        console.error("POST /api/chat/messages error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
