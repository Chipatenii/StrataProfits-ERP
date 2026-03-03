import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/chat/channels — list channels the user belongs to
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        // Fetch channels the user is a member of, with member count
        const { data: memberships, error: memErr } = await supabase
            .from("chat_channel_members")
            .select("channel_id, last_read_at")
            .eq("user_id", user.id)

        if (memErr) throw memErr

        const channelIds = (memberships || []).map(m => m.channel_id)

        if (channelIds.length === 0) {
            return NextResponse.json([])
        }

        const { data: channels, error: chErr } = await supabase
            .from("chat_channels")
            .select("*, members:chat_channel_members(user_id, user:profiles!chat_channel_members_user_id_fkey(full_name, avatar_url))")
            .in("id", channelIds)
            .order("created_at", { ascending: true })

        if (chErr) throw chErr

        // Get the latest message for each channel
        const enriched = await Promise.all((channels || []).map(async (ch) => {
            const { data: lastMsg } = await supabase
                .from("chat_messages")
                .select("content, created_at, sender:profiles!chat_messages_sender_id_fkey(full_name)")
                .eq("channel_id", ch.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single()

            // Count unread messages
            const membership = memberships?.find(m => m.channel_id === ch.id)
            const lastReadAt = membership?.last_read_at || new Date(0).toISOString()
            const { count: unreadCount } = await supabase
                .from("chat_messages")
                .select("id", { count: "exact", head: true })
                .eq("channel_id", ch.id)
                .gt("created_at", lastReadAt)

            return {
                ...ch,
                last_message: lastMsg || null,
                unread_count: unreadCount || 0,
            }
        }))

        return NextResponse.json(enriched)
    } catch (error: any) {
        console.error("GET /api/chat/channels error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST /api/chat/channels — create a channel or DM
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const body = await request.json()
        const { name, description, is_dm, member_ids } = body

        if (!name) return NextResponse.json({ error: "Channel name is required" }, { status: 400 })

        // Create the channel
        const { data: channel, error: chErr } = await supabase
            .from("chat_channels")
            .insert({ name, description: description || null, is_dm: is_dm || false, created_by: user.id })
            .select()
            .single()

        if (chErr) throw chErr

        // Add creator as member
        const members = [user.id, ...(member_ids || []).filter((id: string) => id !== user.id)]
        const memberInserts = members.map((uid: string) => ({ channel_id: channel.id, user_id: uid }))

        const { error: memErr } = await supabase.from("chat_channel_members").insert(memberInserts)
        if (memErr) throw memErr

        return NextResponse.json(channel, { status: 201 })
    } catch (error: any) {
        console.error("POST /api/chat/channels error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
