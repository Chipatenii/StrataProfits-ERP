import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
    const supabase = createClient()
    
    try {
        const { data: { user }, error: authError } = await (await supabase).auth.getUser()
        if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        
        // Get today's checkins limit to today in UTC or server time
        const today = new Date().toISOString().split("T")[0]
        
        const { data, error } = await (await supabase)
            .from("daily_checkins")
            .select(`
                *,
                user:profiles(id, full_name, avatar_url, role)
            `)
            .eq("date", today)
            .order("created_at", { ascending: false })
            
        if (error) throw error
        
        return NextResponse.json(data)
    } catch (error) {
        console.error("GET /api/checkins Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const supabase = createClient()
    
    try {
        const { data: { user }, error: authError } = await (await supabase).auth.getUser()
        if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        
        const body = await request.json()
        const { what_i_did, what_im_doing, blockers } = body
        
        if (!what_i_did || !what_im_doing) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }
        
        const today = new Date().toISOString().split("T")[0]
        
        // Check if already checked in today
        const { data: existing, error: existingError } = await (await supabase)
            .from("daily_checkins")
            .select("id")
            .eq("user_id", user.id)
            .eq("date", today)
            .maybeSingle()

        if (existingError) throw existingError

        if (existing) {
            return NextResponse.json({ error: "Already checked in today" }, { status: 400 })
        }
        
        const { data, error } = await (await supabase)
            .from("daily_checkins")
            .insert({
                user_id: user.id,
                date: today,
                what_i_did,
                what_im_doing,
                blockers: blockers || null
            })
            .select()
            .single()
            
        if (error) throw error
        
        return NextResponse.json(data)
    } catch (error) {
        console.error("POST /api/checkins Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
