"use client"

import { useEffect, useState, useCallback } from "react"
import { Download, Loader2 } from "lucide-react"
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

export function ReportsView() {
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
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Monthly Reports</h2>
                    <p className="text-sm text-muted-foreground">Track team hours, payroll, and productivity.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full sm:w-auto px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    />
                    <button onClick={handleExportPDF} className="w-full sm:w-auto flex items-center justify-center gap-2 btn-secondary text-sm px-4 py-2">
                        <Download className="w-4 h-4" />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Summary Card */}
            <div className="glass-card rounded-xl p-4 md:p-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Summary</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-background/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                        <p className="text-2xl font-bold text-accent">{totalCompanyHours.toFixed(1)}</p>
                    </div>
                    <div className="p-4 bg-background/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Team Count</p>
                        <p className="text-2xl font-bold text-primary">{reports.filter((r) => r.days_worked > 0).length}</p>
                    </div>
                    <div className="p-4 bg-background/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Avg Hours/Person</p>
                        <p className="text-2xl font-bold text-primary">
                            {reports.length > 0
                                ? (Math.round((reports.reduce((acc, r) => acc + r.total_hours, 0) / reports.length) * 100) / 100).toFixed(1)
                                : "0"}
                        </p>
                    </div>
                    <div className="p-4 bg-background/50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Est. Payroll</p>
                        <p className="text-2xl font-bold text-green-600 truncate">ZMW {totalEstimatedPayroll.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Productivity Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {topPerformer ? (
                    <div className="glass-card rounded-xl p-6 bg-green-50/50 border-green-100 flex items-center justify-between">
                        <div>
                            <p className="flex items-center gap-2 text-sm font-semibold text-green-800 mb-1">
                                Top Performer 🏆
                            </p>
                            <p className="font-bold text-lg">{topPerformer.full_name}</p>
                            <p className="text-xs text-green-700">{topPerformer.email}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-green-700">{topPerformer.total_hours.toFixed(1)}h</p>
                        </div>
                    </div>
                ) : null}

                {leastProductive ? (
                    <div className="glass-card rounded-xl p-6 bg-orange-50/50 border-orange-100 flex items-center justify-between">
                        <div>
                            <p className="flex items-center gap-2 text-sm font-semibold text-orange-800 mb-1">
                                Needs Support 💪
                            </p>
                            <p className="font-bold text-lg">{leastProductive.full_name}</p>
                            <p className="text-xs text-orange-700">{leastProductive.email}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-orange-700">{leastProductive.total_hours.toFixed(1)}h</p>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Detail List / Table */}
            <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border/50">
                    <h3 className="font-semibold text-foreground">Team Details</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/30">
                            <tr className="border-b border-border/50">
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total Hours</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Days</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Daily Avg</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Payroll</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {reports.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        No data available for this month
                                    </td>
                                </tr>
                            ) : (
                                reports.map((report) => (
                                    <>
                                        <tr
                                            key={report.user_id}
                                            className="hover:bg-muted/20 transition-colors cursor-pointer"
                                            onClick={() => setExpandedUser(expandedUser === report.user_id ? null : report.user_id)}
                                        >
                                            <td className="px-4 py-4">
                                                <div className="font-medium">{report.full_name}</div>
                                                <div className="text-xs text-muted-foreground sm:hidden">{report.email}</div>
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-accent">{report.total_hours.toFixed(1)}</td>
                                            <td className="px-4 py-4 hidden sm:table-cell">{report.days_worked}</td>
                                            <td className="px-4 py-4 hidden sm:table-cell">{report.average_hours_per_day.toFixed(1)}</td>
                                            <td className="px-4 py-4 font-medium text-green-600">ZMW {report.estimated_payroll.toFixed(0)}</td>
                                        </tr>
                                        {expandedUser === report.user_id && (
                                            <tr className="bg-muted/20 shadow-inner">
                                                <td colSpan={5} className="px-4 py-4">
                                                    <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-accent/30">
                                                        <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Top Tasks</h4>
                                                        {report.tasks && report.tasks.length > 0 ? (
                                                            <div className="grid gap-2">
                                                                {report.tasks.slice(0, 5).map((task, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between text-xs sm:text-sm bg-background p-2 rounded border border-border/50">
                                                                        <span className="font-medium truncate mr-2">{task.title}</span>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <span className="font-mono">{task.hours.toFixed(1)}h</span>
                                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                                                }`}>
                                                                                {task.status.replace('_', ' ')}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {report.tasks.length > 5 && (
                                                                    <p className="text-xs text-muted-foreground italic text-center">+ {report.tasks.length - 5} more tasks</p>
                                                                )}
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
    )
}
