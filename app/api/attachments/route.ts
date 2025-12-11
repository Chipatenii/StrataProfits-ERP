import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const createAttachmentSchema = z.object({
    entity_type: z.enum(["meeting", "deal", "task"]),
    entity_id: z.string().uuid(),
    file_name: z.string().min(1),
    file_url: z.string().url(),
    file_type: z.string().optional(),
    file_size: z.number().optional()
})

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const entityType = searchParams.get('entity_type')
        const entityId = searchParams.get('entity_id')

        if (!entityType || !entityId) {
            return NextResponse.json({ error: "Missing entity_type or entity_id" }, { status: 400 })
        }

        const admin = await createAdminClient()
        const { data: attachments, error } = await admin
            .from("attachments")
            .select(`
                *,
                uploaded_by:profiles(full_name, avatar_url)
            `)
            .eq("entity_type", entityType)
            .eq("entity_id", entityId)
            .order("created_at", { ascending: false })

        if (error) throw error

        return NextResponse.json(attachments)
    } catch (error) {
        console.error("Error fetching attachments:", error)
        return NextResponse.json({ error: "Failed to fetch attachments" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        // Authenticate
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const body = await request.json()
        const validation = createAttachmentSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 })
        }

        const admin = await createAdminClient()
        const { data: attachment, error } = await admin
            .from("attachments")
            .insert({
                ...validation.data,
                uploaded_by_user_id: user.id
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(attachment)
    } catch (error) {
        console.error("Error creating attachment:", error)
        return NextResponse.json({ error: "Failed to create attachment" }, { status: 500 })
    }
}
