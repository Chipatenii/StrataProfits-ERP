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
      .select("user_id, duration_minutes, clock_in, task_id")
      .gte("clock_in", `${startDate}T00:00:00.000Z`)
      .lte("clock_in", `${endDate}T23:59:59.999Z`)

    if (logsError) throw logsError

    // Get all tasks referenced in time logs
    const taskIds = Array.from(new Set(timeLogs?.map((log) => log.task_id).filter(Boolean) || []))
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, title, estimated_hours, status")
      .in("id", taskIds)

    if (tasksError) throw tasksError

    const taskMap = new Map(tasks?.map((t) => [t.id, t]))

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
        tasks: new Map<string, {
          title: string;
          minutes: number;
          estimated: number | null;
          status: string;
        }>(),
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

        // Aggregate task time
        if (log.task_id) {
          const task = taskMap.get(log.task_id)
          if (task) {
            const taskStats = report.tasks.get(log.task_id) || {
              title: task.title,
              minutes: 0,
              estimated: task.estimated_hours,
              status: task.status
            }
            taskStats.minutes += log.duration_minutes || 0
            report.tasks.set(log.task_id, taskStats)
          }
        }
      }
    })

    // Calculate final metrics
    const finalReports: any[] = []
    reportMap.forEach((report) => {
      const userDaysWorked = Array.from(daysWorked).filter((day) => day.startsWith(`${report.user_id}-`)).length

      const totalHours = Math.round(((report.total_minutes || 0) / 60) * 100) / 100
      const averagePerDay = userDaysWorked > 0 ? Math.round((totalHours / userDaysWorked) * 100) / 100 : 0

      // Convert tasks map to array
      const tasksArray = Array.from(report.tasks.values()).map((t: any) => ({
        ...t,
        hours: Math.round((t.minutes / 60) * 100) / 100
      })).sort((a: any, b: any) => b.minutes - a.minutes)

      finalReports.push({
        user_id: report.user_id,
        full_name: report.full_name,
        email: report.email,
        total_hours: totalHours,
        total_minutes: report.total_minutes || 0,
        days_worked: userDaysWorked,
        average_hours_per_day: averagePerDay,
        tasks: tasksArray,
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
