import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { startDate, endDate } = await request.json()
    const admin = await createAdminClient()

    // Role Check
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'book_keeper') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get all team members with hourly rates
    const { data: members, error: membersError } = await admin
      .from("profiles")
      .select("id, full_name, email, role, hourly_rate")
      .neq("role", "admin")

    if (membersError) throw membersError

    // Get time logs for the date range — use admin client so RLS does not
    // restrict results to only the currently logged-in user's records.
    // is_approved is included so we can split verified (paid) hours from
    // pending (claimed but not yet verified by an admin).
    const { data: timeLogs, error: logsError } = await admin
      .from("time_logs")
      .select("user_id, duration_minutes, clock_in, task_id, is_approved")
      .gte("clock_in", `${startDate}T00:00:00.000Z`)
      .lte("clock_in", `${endDate}T23:59:59.999Z`)

    if (logsError) throw logsError

    // Get all tasks referenced in time logs — guard against empty id list.
    const taskIds = Array.from(
      new Set((timeLogs ?? []).map((log: any) => log.task_id).filter(Boolean))
    )
    let taskMap = new Map<string, any>()
    if (taskIds.length > 0) {
      const { data: tasks, error: tasksError } = await admin
        .from("tasks")
        .select("id, title, estimated_hours, status")
        .in("id", taskIds)

      if (tasksError) throw tasksError
      taskMap = new Map<string, any>((tasks ?? []).map((t: any) => [t.id, t]))
    }

    // Calculate reports for each team member
    const reportMap = new Map<string, any>()

    members?.forEach((member: any) => {
      reportMap.set(member.id, {
        user_id: member.id,
        full_name: member.full_name,
        email: member.email,
        total_hours: 0,
        total_minutes: 0,
        verified_minutes: 0,
        pending_minutes: 0,
        days_worked: 0,
        average_hours_per_day: 0,
        // date(YYYY-MM-DD) -> minutes worked that day, used for the daily
        // ceiling check below.
        dailyMinutes: new Map<string, number>(),
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
    let totalVerifiedMinutes = 0

    timeLogs?.forEach((log: any) => {
      const report = reportMap.get(log.user_id)
      if (report) {
        const minutes = log.duration_minutes || 0
        // is_approved defaults to true for legacy logs; only explicit `false`
        // (set by the back-fill or by rejectCompletedTask) counts as pending.
        const isVerified = log.is_approved !== false

        report.total_minutes += minutes
        if (isVerified) {
          report.verified_minutes += minutes
          totalVerifiedMinutes += minutes
        } else {
          report.pending_minutes += minutes
        }

        const date = new Date(log.clock_in).toISOString().split("T")[0]
        daysWorked.add(`${log.user_id}-${date}`)
        report.dailyMinutes.set(date, (report.dailyMinutes.get(date) || 0) + minutes)
        totalMinutes += minutes

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
            taskStats.minutes += minutes
            report.tasks.set(log.task_id, taskStats)
          }
        }
      }
    })

    // Get payments for the date range
    const { data: teamPayments } = await admin
      .from("team_payments")
      .select("*")
      .gte("period_start", startDate)
      .lte("period_end", endDate)

    // Daily ceiling: any day above this is flagged as suspiciously high.
    const DAILY_HOUR_CEILING = 12

    // Calculate final metrics
    const finalReports: any[] = []
    reportMap.forEach((report) => {
      const userDaysWorked = Array.from(daysWorked).filter((day) => day.startsWith(`${report.user_id}-`)).length

      const totalHours = Math.round(((report.total_minutes || 0) / 60) * 100) / 100
      const verifiedHours = Math.round(((report.verified_minutes || 0) / 60) * 100) / 100
      const pendingHours = Math.round(((report.pending_minutes || 0) / 60) * 100) / 100
      const averagePerDay = userDaysWorked > 0 ? Math.round((totalHours / userDaysWorked) * 100) / 100 : 0

      // Convert tasks map to array
      const tasksArray = Array.from(report.tasks.values()).map((t: any) => ({
        ...t,
        hours: Math.round((t.minutes / 60) * 100) / 100
      })).sort((a: any, b: any) => b.minutes - a.minutes)

      // Daily ceiling flags — any date that breached the limit.
      const overworkedDays = Array.from(report.dailyMinutes.entries() as Iterable<[string, number]>)
        .filter(([, mins]) => mins / 60 > DAILY_HOUR_CEILING)
        .map(([date, mins]) => ({
          date,
          hours: Math.round((mins / 60) * 100) / 100,
        }))
        .sort((a, b) => b.hours - a.hours)

      // Find the member's hourly rate
      const member = members?.find((m: any) => m.id === report.user_id)
      const hourlyRate = member?.hourly_rate || 0
      // Payroll is based on verified hours only — pending hours are claimed
      // but not yet approved by an admin and must not pay out automatically.
      const estimatedPayroll = Math.round((verifiedHours * hourlyRate) * 100) / 100
      const pendingPayroll = Math.round((pendingHours * hourlyRate) * 100) / 100

      // Get payments for this user
      const userPayments = (teamPayments ?? [])
        .filter((p: any) => p.user_id === report.user_id)
        .sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      const totalPaid = userPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)

      // Expose the true balance: negative means overpaid, positive means outstanding.
      const remainingBalance = Math.round((estimatedPayroll - totalPaid) * 100) / 100

      finalReports.push({
        user_id: report.user_id,
        full_name: report.full_name,
        email: report.email,
        hourly_rate: hourlyRate,
        total_hours: totalHours,
        verified_hours: verifiedHours,
        pending_hours: pendingHours,
        total_minutes: report.total_minutes || 0,
        days_worked: userDaysWorked,
        average_hours_per_day: averagePerDay,
        estimated_payroll: estimatedPayroll,
        pending_payroll: pendingPayroll,
        total_paid: totalPaid,
        remaining_balance: remainingBalance,
        overworked_days: overworkedDays,
        payments: userPayments,
        tasks: tasksArray,
      })
    })

    finalReports.sort((a, b) => b.total_hours - a.total_hours)
    const totalCompanyHours = Math.round((totalMinutes / 60) * 100) / 100
    const totalVerifiedHours = Math.round((totalVerifiedMinutes / 60) * 100) / 100
    const totalPendingHours = Math.round((totalCompanyHours - totalVerifiedHours) * 100) / 100
    const totalEstimatedPayroll = Math.round(finalReports.reduce((sum, r) => sum + r.estimated_payroll, 0) * 100) / 100
    const totalPendingPayroll = Math.round(finalReports.reduce((sum, r) => sum + r.pending_payroll, 0) * 100) / 100

    return NextResponse.json({
      reports: finalReports,
      totalCompanyHours,
      totalVerifiedHours,
      totalPendingHours,
      totalEstimatedPayroll,
      totalPendingPayroll,
      dailyHourCeiling: DAILY_HOUR_CEILING,
    })
  } catch (error) {
    console.error("Error generating reports:", error)
    return NextResponse.json({ error: "Failed to generate reports" }, { status: 500 })
  }
}
