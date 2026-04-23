import { createClient } from "@/lib/supabase/server"
import { driveList } from "@/lib/google/drive"
import { NextRequest, NextResponse } from "next/server"

// GET /api/drive/list?parent_id=xxx&q=search — list files in a Drive folder
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role === "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

        const { searchParams } = new URL(request.url)
        const parentId = searchParams.get("parent_id")
        const q = searchParams.get("q") || undefined

        const files = await driveList(parentId, q)
        return NextResponse.json(files)
    } catch (e: any) {
        console.error("Drive list error:", e)
        return NextResponse.json({ error: e.message || "Failed" }, { status: 500 })
    }
}
