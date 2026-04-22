"use client"

import { useEffect, useState, useCallback, Fragment } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download } from "lucide-react"
import jsPDF from "jspdf"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { RecordPayrollModal } from "@/components/modals/record-payroll-modal"

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
  total_paid?: number
  remaining_balance?: number
  payments?: Array<{
    id: string
    payment_date: string
    amount: number
    payment_method: string
    reference: string
    notes?: string
  }>
  tasks: Array<{
    title: string
    hours: number
    estimated: number | null
    status: string
  }>
}

export function MonthlyReports() {
  const router = useRouter()
  const [reports, setReports] = useState<TeamMemberReport[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [totalCompanyHours, setTotalCompanyHours] = useState(0)
  const [totalEstimatedPayroll, setTotalEstimatedPayroll] = useState(0)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [topPerformer, setTopPerformer] = useState<TeamMemberReport | null>(null)
  const [leastProductive, setLeastProductive] = useState<TeamMemberReport | null>(null)

  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false)
  const [memberToPay, setMemberToPay] = useState<{ id: string, name: string, estimatedPayroll: number } | null>(null)

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

  useRealtimeSubscription("tasks", loadReports)
  useRealtimeSubscription("time_logs", loadReports)

  const handleExportPDF = () => {
    const doc = new jsPDF()
    doc.text(`STRATAFORGE BUSINESS SUITE - MONTHLY REPORT`, 10, 10)
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

      doc.line(10, y, 200, y)
      y += 10
    })

    doc.save(`strataforge-report-${selectedMonth}.pdf`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-600 border-t-transparent"></div>
      </div>
    )
  }

  const activeCount = reports.filter((r) => r.days_worked > 0).length
  const avgHours = reports.length > 0
    ? (Math.round((reports.reduce((acc, r) => acc + r.total_hours, 0) / reports.length) * 100) / 100).toFixed(2)
    : "0"

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Monthly Reports</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Team hours tracking</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Select month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total hours</p>
            <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">{totalCompanyHours}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Team members</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Avg hours / person</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{avgHours}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Est. payroll</p>
            <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-400 font-mono">ZMW {totalEstimatedPayroll.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topPerformer && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-3">Top performer</h3>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-base text-slate-900 dark:text-white truncate">{topPerformer.full_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{topPerformer.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">{topPerformer.total_hours.toFixed(1)} hrs</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">This month</p>
                </div>
              </div>
            </div>
          )}

          {leastProductive && (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-3">Needs support</h3>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-base text-slate-900 dark:text-white truncate">{leastProductive.full_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{leastProductive.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">{leastProductive.total_hours.toFixed(1)} hrs</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">This month</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Team member details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/30 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-right font-medium">Total hrs</th>
                  <th className="px-4 py-3 text-right font-medium">Days</th>
                  <th className="px-4 py-3 text-right font-medium">Avg/day</th>
                  <th className="px-4 py-3 text-right font-medium">Est. payroll</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      No data available for this month
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <Fragment key={report.user_id}>
                      <tr
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedUser(expandedUser === report.user_id ? null : report.user_id)}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{report.full_name}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{report.email}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">{report.total_hours.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{report.days_worked}</td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300 font-mono">{report.average_hours_per_day.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 font-mono">ZMW {report.estimated_payroll.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 dark:text-emerald-400 font-mono">ZMW {(report.remaining_balance || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setMemberToPay({
                                id: report.user_id,
                                name: report.full_name,
                                estimatedPayroll: report.remaining_balance || report.estimated_payroll
                              })
                              setIsPayrollModalOpen(true)
                            }}
                            className="inline-flex items-center px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md transition-colors"
                          >
                            Record Payment
                          </button>
                        </td>
                      </tr>
                      {expandedUser === report.user_id && (
                        <tr className="bg-slate-50 dark:bg-slate-800/30">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Payment history</h4>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">Total paid: <span className="font-mono">ZMW {(report.total_paid || 0).toFixed(2)}</span></span>
                                </div>
                                {report.payments && report.payments.length > 0 ? (
                                  <div className="space-y-2">
                                    {report.payments.map((payment) => (
                                      <div key={payment.id} className="flex items-center justify-between text-sm bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                                        <div>
                                          <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">ZMW {payment.amount.toFixed(2)}</span>
                                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{new Date(payment.payment_date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                          <span className="capitalize text-[10px] font-semibold bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md uppercase">{payment.payment_method.replace("_", " ")}</span>
                                          {payment.reference && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Ref: {payment.reference}</p>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-500 dark:text-slate-400 p-4 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center">No past payments recorded for this period.</p>
                                )}
                              </div>
                              <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Task breakdown</h4>
                                {report.tasks && report.tasks.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {report.tasks.map((task, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-sm bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                        <span className="font-medium text-slate-900 dark:text-white truncate">{task.title}</span>
                                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 shrink-0">
                                          <span className="font-mono text-xs">{task.hours.toFixed(2)}h</span>
                                          {task.estimated && (
                                            <span className={`text-xs font-mono ${task.hours > task.estimated ? "text-rose-500 dark:text-rose-400 font-medium" : "text-emerald-700 dark:text-emerald-400"}`}>
                                              (Est: {task.estimated}h)
                                            </span>
                                          )}
                                          <span className="capitalize px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-[10px] font-semibold uppercase">
                                            {task.status}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-500 dark:text-slate-400">No specific task data available.</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <RecordPayrollModal
        open={isPayrollModalOpen}
        onOpenChange={setIsPayrollModalOpen}
        onSuccess={loadReports}
        member={memberToPay}
        periodStart={`${selectedMonth}-01`}
        periodEnd={`${selectedMonth}-${new Date(Number.parseInt(selectedMonth.split("-")[0]), Number.parseInt(selectedMonth.split("-")[1]), 0).getDate()}`}
      />
    </div>
  )
}
