import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { hasPermission } from "@/lib/permissions"
import { UserProfile } from "@/lib/types"
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

    // Any authenticated team user can see the team roster (needed for task
    // assignment, meeting attendees, project members, etc.). Clients and
    // anonymous users are blocked. Sensitive fields (hourly_rate) are
    // redacted for callers without the privileged users:read permission.
    if (!profile || profile.role === "client") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const canSeePay = hasPermission(profile.role as UserProfile["role"], "users:read")
    const selectColumns = canSeePay
      ? "id, full_name, email, role, hourly_rate, created_at, avatar_url"
      : "id, full_name, email, role, created_at, avatar_url"

    const { data: members, error } = await admin
      .from("profiles")
      .select(selectColumns)
      .neq("role", "client")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(members || [])
  } catch (error) {
    console.error("Error fetching members:", error)
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}
