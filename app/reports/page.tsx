import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MonthlyReports } from "@/components/monthly-reports"

export default async function ReportsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile to check role
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  const isAdmin = profile?.role === "admin"

  if (!isAdmin) {
    redirect("/dashboard")
  }

  return <MonthlyReports userId={user.id} />
}
