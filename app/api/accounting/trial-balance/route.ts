import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = await createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    if (!["admin", "book_keeper"].includes(profile?.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const asOf = searchParams.get("as_of") // YYYY-MM-DD, optional

    // If as_of provided, compute from raw lines filtered by date; otherwise use the view
    if (!asOf) {
        const { data, error } = await admin.from("trial_balance").select("*")
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    }

    // Ad-hoc aggregation with date filter
    const { data, error } = await admin.rpc("trial_balance_as_of", { as_of_date: asOf })

    if (error && error.code === "PGRST202") {
        // RPC not defined — fall back to a direct aggregation via join
        const { data: rows, error: joinErr } = await admin
            .from("journal_lines")
            .select("account_id, base_debit, base_credit, entry:journal_entries!inner(entry_date, status)")
            .lte("entry.entry_date", asOf)
            .eq("entry.status", "posted")

        if (joinErr) return NextResponse.json({ error: joinErr.message }, { status: 500 })

        const { data: accounts } = await admin.from("accounts").select("id, code, name, type, subtype")

        const agg = new Map<string, { total_debits: number; total_credits: number }>()
        for (const row of rows || []) {
            const a = agg.get(row.account_id) || { total_debits: 0, total_credits: 0 }
            a.total_debits += Number(row.base_debit) || 0
            a.total_credits += Number(row.base_credit) || 0
            agg.set(row.account_id, a)
        }

        const result = (accounts || [])
            .map(acc => {
                const a = agg.get(acc.id)
                if (!a || (a.total_debits === 0 && a.total_credits === 0)) return null
                const balance = ["asset", "expense"].includes(acc.type)
                    ? a.total_debits - a.total_credits
                    : a.total_credits - a.total_debits
                return { ...acc, ...a, balance }
            })
            .filter(Boolean)
            .sort((a: any, b: any) => a.code.localeCompare(b.code))

        return NextResponse.json(result)
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
}
