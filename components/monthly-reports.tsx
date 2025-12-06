"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, Loader2 } from "lucide-react"
import jsPDF from "jspdf"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"

interface TeamMemberReport {
  user_id: string
  full_name: string
  email: string
  hourly_rate: number
  total_hours: number
  total_minutes: number
  days_worked: number
  average_hours_per_day: number
  estimated_payroll: number
  tasks: Array<{
    title: string
    hours: number
    estimated: number | null
    status: string
  }>
}

export function MonthlyReports({ userId }: { userId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [reports, setReports] = useState<TeamMemberReport[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [totalCompanyHours, setTotalCompanyHours] = useState(0)
  const [totalEstimatedPayroll, setTotalEstimatedPayroll] = useState(0)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [topPerformer, setTopPerformer] = useState<TeamMemberReport | null>(null)
  const [leastProductive, setLeastProductive] = useState<TeamMemberReport | null>(null)

  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const [year, month] = selectedMonth.split("-")
      const startDate = `${year}-${month}-01`
      const endDate = new Date(Number.parseInt(year), Number.parseInt(month), 0).toISOString().split("T")[0]

      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      })

      const { reports: fetchedReports, totalCompanyHours: totalHours, totalEstimatedPayroll: totalPayroll } = await response.json()

      setReports(fetchedReports || [])
      setTotalCompanyHours(totalHours || 0)
      setTotalEstimatedPayroll(totalPayroll || 0)

      // Find top performer and least productive
      if (fetchedReports && fetchedReports.length > 0) {
        const top = fetchedReports.reduce((prev: TeamMemberReport, current: TeamMemberReport) =>
          (current.total_hours > prev.total_hours) ? current : prev
        )
        setTopPerformer(top)

        const least = fetchedReports.reduce((prev: TeamMemberReport, current: TeamMemberReport) =>
          (current.total_hours < prev.total_hours && current.total_hours > 0) ? current : prev
        )
        setLeastProductive(least)
      } else {
        setTopPerformer(null)
        setLeastProductive(null)
      }
    } catch (error) {
      console.error("Error loading reports:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  // Real-time subscriptions
  useRealtimeSubscription("tasks", loadReports)
  useRealtimeSubscription("time_logs", loadReports)

  const handleExportPDF = () => {
    const doc = new jsPDF()
    doc.text(`OSTENTO MEDIA AGENCY - MONTHLY REPORT`, 10, 10)
    doc.text(`Month: ${selectedMonth}`, 10, 20)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 10, 30)

    doc.text(`SUMMARY`, 10, 40)
    doc.text(`================`, 10, 50)
    doc.text(`Total Company Hours: ${totalCompanyHours} hours`, 10, 60)
    doc.text(`Active Team Members: ${reports.filter((r) => r.days_worked > 0).length}`, 10, 70)
    doc.text(
      `Average Hours per Person: ${reports.length > 0 ? (Math.round((reports.reduce((acc, r) => acc + r.total_hours, 0) / reports.length) * 100) / 100).toFixed(2) : "0"} hours`,
      10,
      80,
    )

    doc.text(`TEAM MEMBER DETAILS`, 10, 90)
    doc.text(`================`, 10, 100)

    let y = 110
    reports.forEach((r) => {
      // Check for page break
      if (y > 250) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(`Name: ${r.full_name}`, 10, y)
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`Email: ${r.email}`, 10, y + 5)
      doc.text(`Total Hours: ${r.total_hours.toFixed(2)}`, 10, y + 10)
      doc.text(`Days Worked: ${r.days_worked}`, 10, y + 15)
      doc.text(`Average Hours/Day: ${r.average_hours_per_day.toFixed(2)}`, 10, y + 20)

      y += 30

      // Task Breakdown
      if (r.tasks && r.tasks.length > 0) {
        doc.setFontSize(9)
        doc.setFont("helvetica", "bold")
        doc.text("Task Breakdown:", 15, y)
        y += 5
        doc.setFont("helvetica", "normal")

        r.tasks.forEach((task) => {
          if (y > 270) {
            doc.addPage()
            y = 20
          }
          const estimatedText = task.estimated ? `/ ${task.estimated}h est.` : ""
          doc.text(`- ${task.title}: ${task.hours.toFixed(2)}h ${estimatedText} (${task.status})`, 20, y)
          y += 5
        })
        y += 10
      } else {
        y += 5
      }

      doc.line(10, y, 200, y) // Separator line
      y += 10
    })

    doc.save(`ostento-report-${selectedMonth}.pdf`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
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
          <button onClick={handleExportPDF} className="flex items-center gap-2 btn-secondary">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        {/* Summary Card */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="p-4 bg-background rounded-lg">
              <p className="text-sm text-muted-foreground">Estimated Payroll</p>
              <p className="text-2xl font-bold text-green-600">ZMW {totalEstimatedPayroll.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Productivity Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {topPerformer && (
            <div className="glass-card rounded-2xl p-6 bg-green-50/50 border-green-100">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Top Performer 🏆</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-xl">{topPerformer.full_name}</p>
                  <p className="text-sm text-muted-foreground">{topPerformer.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{topPerformer.total_hours.toFixed(1)} hrs</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
              </div>
            </div>
          )}

          {leastProductive && (
            <div className="glass-card rounded-2xl p-6 bg-orange-50/50 border-orange-100">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">Needs Support 💪</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-xl">{leastProductive.full_name}</p>
                  <p className="text-sm text-muted-foreground">{leastProductive.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-600">{leastProductive.total_hours.toFixed(1)} hrs</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
              </div>
            </div>
          )}
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
                    <th className="px-6 py-3 text-left text-sm font-semibold">Est. Payroll</th>
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
                      <>
                        <tr
                          key={report.user_id}
                          className="border-b border-border hover:bg-background/50 transition-colors cursor-pointer"
                          onClick={() => setExpandedUser(expandedUser === report.user_id ? null : report.user_id)}
                        >
                          <td className="px-6 py-4 font-medium">{report.full_name}</td>
                          <td className="px-6 py-4 text-muted-foreground">{report.email}</td>
                          <td className="px-6 py-4 font-semibold text-accent">{report.total_hours.toFixed(2)}</td>
                          <td className="px-6 py-4">{report.days_worked}</td>
                          <td className="px-6 py-4">{report.average_hours_per_day.toFixed(2)}</td>
                          <td className="px-6 py-4 font-medium text-green-600">ZMW {report.estimated_payroll.toFixed(2)}</td>
                        </tr>
                        {expandedUser === report.user_id && (
                          <tr className="bg-muted/30">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm mb-2">Task Breakdown</h4>
                                {report.tasks && report.tasks.length > 0 ? (
                                  <div className="grid gap-2">
                                    {report.tasks.map((task, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-sm bg-white/50 p-2 rounded">
                                        <span className="font-medium">{task.title}</span>
                                        <div className="flex items-center gap-4 text-muted-foreground">
                                          <span>{task.hours.toFixed(2)} hrs</span>
                                          {task.estimated && (
                                            <span className={task.hours > task.estimated ? "text-red-500 font-medium" : "text-green-600"}>
                                              (Est: {task.estimated} hrs)
                                            </span>
                                          )}
                                          <span className="capitalize px-2 py-0.5 rounded bg-gray-100 text-xs">
                                            {task.status}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No specific task data available.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
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
