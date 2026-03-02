import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateDocumentNumber } from "@/lib/utils/document-numbers"

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const admin = await createAdminClient()
        const number = await generateDocumentNumber(admin, 'quotes', 'QUO')
        return NextResponse.json({ number })
    } catch (error) {
        console.error("Error generating quote number:", error)
        return NextResponse.json({ error: "Failed to generate number" }, { status: 500 })
    }
}
