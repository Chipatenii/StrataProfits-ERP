import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createAccountSchema, updateAccountSchema } from "@/lib/schemas"
import { NextResponse, type NextRequest } from "next/server"

export const dynamic = "force-dynamic"

async function authorize(required: "read" | "write") {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), admin: null, user: null }

    const admin = await createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    const writeRoles = ["admin", "book_keeper"]
    const readRoles = [...writeRoles, "virtual_assistant"]
    const allowed = required === "write" ? writeRoles : readRoles

    if (!allowed.includes(profile?.role)) {
        return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), admin: null, user: null }
    }

    return { error: null, admin, user }
}

export async function GET() {
    const { error: authErr, admin } = await authorize("read")
    if (authErr) return authErr

    const { data, error } = await admin!
        .from("accounts")
        .select("*")
        .order("code")

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
    const { error: authErr, admin } = await authorize("write")
    if (authErr) return authErr

    const body = await request.json()
    const validation = createAccountSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 })
    }

    const { data, error } = await admin!.from("accounts").insert(validation.data).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
    const { error: authErr, admin } = await authorize("write")
    if (authErr) return authErr

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const body = await request.json()
    const validation = updateAccountSchema.safeParse(body)
    if (!validation.success) {
        return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 })
    }

    const { data, error } = await admin!
        .from("accounts")
        .update(validation.data)
        .eq("id", id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
    const { error: authErr, admin } = await authorize("write")
    if (authErr) return authErr

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const { data: account } = await admin!.from("accounts").select("is_system").eq("id", id).single()
    if (account?.is_system) {
        return NextResponse.json({ error: "System accounts cannot be deleted. Deactivate instead." }, { status: 422 })
    }

    const { count } = await admin!
        .from("journal_lines")
        .select("id", { count: "exact", head: true })
        .eq("account_id", id)

    if ((count ?? 0) > 0) {
        return NextResponse.json({ error: "Account has journal activity. Deactivate instead." }, { status: 422 })
    }

    const { error } = await admin!.from("accounts").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
