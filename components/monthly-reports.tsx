"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download } from "lucide-react"

interface TeamMemberReport {
  user_id: string
  full_name: string
  email: string
  total_hours: number
  total_minutes: number
  days_worked: number
  average_hours_per_day: number
}

export function MonthlyReports({ userId }: { userId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [reports, setReports] = useState<TeamMemberReport[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [totalCompanyHours, setTotalCompanyHours] = useState(0)

  useEffect(() => {
    loadReports()
  }, [selectedMonth])

  const loadReports = async () => {
    setLoading(true)
    try {
      const [year, month] = selectedMonth.split("-")
      const startDate = `${year}-${month}-01`
      const endDate = new Date(Number.parseInt(year), Number.parseInt(month), 0).toISOString().split("T")[0]

      // Get all team members
      const { data: members } = await supabase.from("profiles").select("id, full_name, email").eq("role", "team_member")

      if (!members) {
        setLoading(false)
        return
      }

      // Get time logs for the month
      const { data: timeLogs } = await supabase
        .from("time_logs")
        .select("user_id, duration_minutes, clock_in")
        .gte("clock_in", startDate + "T00:00:00")
        .lte("clock_in", endDate + "T23:59:59")

      // Calculate reports for each team member
      const reportMap = new Map<string, Partial<TeamMemberReport>>()

      members.forEach((member) => {
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
      const finalReports: TeamMemberReport[] = []
      reportMap.forEach((report) => {
        const userDaysWorked = Array.from(daysWorked).filter((day) => day.startsWith(`${report.user_id}-`)).length

        const totalHours = Math.round(((report.total_minutes || 0) / 60) * 100) / 100
        const averagePerDay = userDaysWorked > 0 ? Math.round((totalHours / userDaysWorked) * 100) / 100 : 0

        finalReports.push({
          user_id: report.user_id!,
          full_name: report.full_name!,
          email: report.email!,
          total_hours: totalHours,
          total_minutes: report.total_minutes || 0,
          days_worked: userDaysWorked,
          average_hours_per_day: averagePerDay,
        })
      })

      finalReports.sort((a, b) => b.total_hours - a.total_hours)
      setReports(finalReports)
      setTotalCompanyHours(Math.round((totalMinutes / 60) * 100) / 100)
    } catch (error) {
      console.error("Error loading reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    const csvContent = [
      ["Team Member", "Email", "Total Hours", "Days Worked", "Average Hours/Day"],
      ...reports.map((r) => [
        r.full_name,
        r.email,
        r.total_hours.toString(),
        r.days_worked.toString(),
        r.average_hours_per_day.toString(),
      ]),
      [],
      ["Total Company Hours", totalCompanyHours.toString()],
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ostento-report-${selectedMonth}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Monthly Reports</h1>
              <p className="text-sm text-muted-foreground">Team hours tracking</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Controls */}
        <div className="glass-card rounded-2xl p-6 flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium mb-2">Select Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button onClick={handleExportCSV} className="flex items-center gap-2 btn-secondary">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Summary Card */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Total Company Hours</p>
              <p className="text-2xl font-bold text-accent">{totalCompanyHours} hrs</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Team Members</p>
              <p className="text-2xl font-bold text-primary">{reports.filter((r) => r.days_worked > 0).length}</p>
            </div>
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Average Hours/Person</p>
              <p className="text-2xl font-bold text-primary">
                {reports.length > 0
                  ? (
                      Math.round((reports.reduce((acc, r) => acc + r.total_hours, 0) / reports.length) * 100) / 100
                    ).toFixed(2)
                  : "0"}{" "}
                hrs
              </p>
            </div>
          </div>
        </div>

        {/* Team Member Reports Table */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Team Member Details</h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary/5">
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Total Hours</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Days Worked</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Avg Hours/Day</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        No data available for this month
                      </td>
                    </tr>
                  ) : (
                    reports.map((report) => (
                      <tr
                        key={report.user_id}
                        className="border-b border-border hover:bg-background/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium">{report.full_name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{report.email}</td>
                        <td className="px-6 py-4 font-semibold text-accent">{report.total_hours.toFixed(2)}</td>
                        <td className="px-6 py-4">{report.days_worked}</td>
                        <td className="px-6 py-4">{report.average_hours_per_day.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
