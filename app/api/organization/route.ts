import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { data, error } = await supabase
            .from("organization_settings")
            .select("*")
            .eq("id", 1)
            .single()

        if (error && error.code !== "PGRST116") {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data || {})
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify admin
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single()

        if (!profile || profile.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
        }

        const body = await request.json()
        
        // Remove id if present to prevent updating primary key
        if ('id' in body) {
            delete body.id
        }

        // Update the single organization settings row (id = 1)
        const { data, error } = await supabase
            .from("organization_settings")
            .update({ ...body, updated_at: new Date().toISOString() })
            .eq("id", 1)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
