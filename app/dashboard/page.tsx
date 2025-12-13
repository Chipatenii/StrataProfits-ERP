import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { TeamMemberDashboard } from "@/components/team-member-dashboard"
import { AdminDashboard } from "@/components/admin-dashboard"

import { VADashboard } from "@/components/va-dashboard"

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

  if (profile?.role === 'virtual_assistant') {
    return (
      <VADashboard
        userId={user.id}
        userName={profile?.full_name || "Virtual Assistant"}
        userEmail={user.email || ""}
        userRole={profile?.role || "virtual_assistant"}
      />
    )
  }

  const isAdmin = profile?.role === "admin"
  const isBookKeeper = profile?.role === "book_keeper"

  return (isAdmin || isBookKeeper) ? (
    <AdminDashboard
      userId={user.id}
      userName={profile?.full_name || "Admin"}
      userRole={profile?.role || "admin"}
    />
  ) : (
    <TeamMemberDashboard userId={user.id} userName={profile?.full_name || "Team Member"} />
  )
}
