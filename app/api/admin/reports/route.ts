import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate } = await request.json()
    const supabase = await createAdminClient()

    // Get all team members
    const { data: members, error: membersError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .neq("role", "admin")

    if (membersError) throw membersError

    // Get time logs for the date range
    const { data: timeLogs, error: logsError } = await supabase
      .from("time_logs")
      .select("user_id, duration_minutes, clock_in")
      .gte("clock_in", `${startDate}T00:00:00.000Z`)
      .lte("clock_in", `${endDate}T23:59:59.999Z`)

    if (logsError) throw logsError

    // Calculate reports for each team member
    const reportMap = new Map<string, any>()

    members?.forEach((member) => {
      reportMap.set(member.id, {
        user_id: member.id,
        full_name: member.full_name,
        email: member.email,
        total_hours: 0,
        total_minutes: 0,
        days_worked: 0,
        average_hours_per_day: 0,
      })
    })

    // Aggregate time logs
    const daysWorked = new Set<string>()
    let totalMinutes = 0

    timeLogs?.forEach((log) => {
      const report = reportMap.get(log.user_id)
      if (report) {
        report.total_minutes = (report.total_minutes || 0) + (log.duration_minutes || 0)
        const date = new Date(log.clock_in).toISOString().split("T")[0]
        daysWorked.add(`${log.user_id}-${date}`)
        totalMinutes += log.duration_minutes || 0
      }
    })

    // Calculate final metrics
    const finalReports: any[] = []
    reportMap.forEach((report) => {
      const userDaysWorked = Array.from(daysWorked).filter((day) => day.startsWith(`${report.user_id}-`)).length

      const totalHours = Math.round(((report.total_minutes || 0) / 60) * 100) / 100
      const averagePerDay = userDaysWorked > 0 ? Math.round((totalHours / userDaysWorked) * 100) / 100 : 0

      finalReports.push({
        user_id: report.user_id,
        full_name: report.full_name,
        email: report.email,
        total_hours: totalHours,
        total_minutes: report.total_minutes || 0,
        days_worked: userDaysWorked,
        average_hours_per_day: averagePerDay,
      })
    })

    finalReports.sort((a, b) => b.total_hours - a.total_hours)
    const totalCompanyHours = Math.round((totalMinutes / 60) * 100) / 100

    return NextResponse.json({
      reports: finalReports,
      totalCompanyHours,
    })
  } catch (error) {
    console.error("Error generating reports:", error)
    return NextResponse.json({ error: "Failed to generate reports" }, { status: 500 })
  }
}
