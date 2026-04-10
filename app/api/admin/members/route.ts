import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

    if (!["admin", "virtual_assistant", "book_keeper"].includes(profile?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch all team members (excluding admins for clarity, or include all with their roles)
    const { data: members, error } = await admin
      .from("profiles")
      .select("id, full_name, email, role, hourly_rate, created_at")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(members || [])
  } catch (error) {
    console.error("Error fetching members:", error)
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}
