import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const sopSchema = z.object({
    title: z.string().min(1),
    content: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    links: z.any().optional() // JSONB
})

async function checkPermission(request: NextRequest, write: boolean = false) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: "Unauthorized", status: 401 }

        // Read: authenticated is enough
        if (!write) return { user }

        // Write: Admin or VA only
        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        if (profile?.role !== 'admin' && profile?.role !== 'virtual_assistant') {
            return { error: "Forbidden", status: 403 }
        }
        return { user }
    } catch (error) {
        console.error("Auth error in SOPs:", error)
        return { error: "Internal Server Error", status: 500 }
    }
}

export async function GET(request: NextRequest) {
    const perm = await checkPermission(request, false)
    if (perm.error) return NextResponse.json({ error: perm.error }, { status: perm.status })

    try {
        const admin = await createAdminClient()
        const { data: sops, error } = await admin
            .from("sops")
            .select("*")
            .order("category", { ascending: true })
            .order("title", { ascending: true })

        if (error) throw error
        return NextResponse.json(sops)
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch SOPs" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const perm = await checkPermission(request, true)
    if (perm.error || !perm.user) return NextResponse.json({ error: perm.error || "Unauthorized" }, { status: perm.status || 401 })

    try {
        const body = await request.json()
        const validation = sopSchema.safeParse(body)
        if (!validation.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 })

        const admin = await createAdminClient()
        const { data: sop, error } = await admin
            .from("sops")
            .insert({
                ...validation.data,
                last_updated_by_user_id: perm.user.id
            })
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(sop)
    } catch (error) {
        return NextResponse.json({ error: "Failed to create SOP" }, { status: 500 })
    }
}
