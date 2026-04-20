import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createJournalEntrySchema } from "@/lib/schemas"
import { postJournalEntry, reverseEntry } from "@/lib/ledger/post"
import { NextResponse, type NextRequest } from "next/server"

export const dynamic = "force-dynamic"

async function requireBookkeeper() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), admin: null, user: null }

    const admin = await createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    if (!["admin", "book_keeper"].includes(profile?.role)) {
        return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), admin: null, user: null }
    }
    return { error: null, admin, user }
}

export async function GET(request: NextRequest) {
    const { error: authErr, admin } = await requireBookkeeper()
    if (authErr) return authErr

    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const source = searchParams.get("source_type")
    const status = searchParams.get("status")
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500)

    let query = admin!
        .from("journal_entries")
        .select("*, lines:journal_lines(*, account:accounts(code, name, type))")
        .order("entry_date", { ascending: false })
        .order("entry_number", { ascending: false })
        .limit(limit)

    if (from) query = query.gte("entry_date", from)
    if (to) query = query.lte("entry_date", to)
    if (source) query = query.eq("source_type", source)
    if (status) query = query.eq("status", status)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
    const { error: authErr, admin, user } = await requireBookkeeper()
    if (authErr) return authErr

    const body = await request.json()
    const validation = createJournalEntrySchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 })
    }

    try {
        const entry = await postJournalEntry(admin!, {
            entry_date: validation.data.entry_date,
            memo: validation.data.memo ?? "",
            source_type: validation.data.source_type,
            source_id: validation.data.source_id ?? null,
            posted_by: user!.id,
            lines: validation.data.lines,
        })
        return NextResponse.json(entry)
    } catch (err: any) {
        return NextResponse.json({ error: err.message ?? "Failed to post entry" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    // Semantically: a "DELETE" creates a reversing entry. Original stays in history.
    const { error: authErr, admin, user } = await requireBookkeeper()
    if (authErr) return authErr

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const reason = searchParams.get("reason") || "Manual reversal"
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    try {
        const reversingId = await reverseEntry(admin!, id, reason, user!.id)
        return NextResponse.json({ success: true, reversing_entry_id: reversingId })
    } catch (err: any) {
        return NextResponse.json({ error: err.message ?? "Failed to reverse" }, { status: 500 })
    }
}
