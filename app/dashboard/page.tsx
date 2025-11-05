import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { TeamMemberDashboard } from "@/components/team-member-dashboard"
import { AdminDashboard } from "@/components/admin-dashboard"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Use admin client to bypass RLS and safely determine user role
  const admin = await createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role, full_name").eq("id", user.id).single()

  const isAdmin = profile?.role === "admin"

  return isAdmin ? (
    <AdminDashboard userId={user.id} userName={profile?.full_name || "Admin"} />
  ) : (
    <TeamMemberDashboard userId={user.id} userName={profile?.full_name || "Team Member"} />
  )
}
