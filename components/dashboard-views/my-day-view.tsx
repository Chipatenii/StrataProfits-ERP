"use client"

import { useState, useEffect } from "react"
import { Sun, CheckCircle, Clock, AlertCircle, Calendar as CalendarIcon } from "lucide-react"
import { Task, Meeting } from "@/lib/types"

interface MyDayViewProps {
    userId: string
    userName: string
}

export function MyDayView({ userId, userName }: MyDayViewProps) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [meetings, setMeetings] = useState<Meeting[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
                // Parallel fetch
                const [tasksRes, meetingsRes] = await Promise.all([
                    fetch(`/api/admin/tasks`), // Admin sees all, we filter client side for now or use specific endpoint
                    fetch(`/api/meetings`)
                ])

                if (tasksRes.ok) {
                    const allTasks: Task[] = await tasksRes.json()
                    // Filter for "Me"
                    const myTasks = allTasks.filter(t => t.assigned_to === userId && t.status !== 'completed')
                    setTasks(myTasks)
                }

                if (meetingsRes.ok) {
                    const allMeetings: Meeting[] = await meetingsRes.json()
                    setMeetings(allMeetings)
                }

            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [userId])

    // Logic: Due Today or Overdue
    const todayStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    const dueToday = tasks.filter(t => t.due_date && t.due_date.startsWith(todayStr))
    const overdue = tasks.filter(t => t.due_date && t.due_date < todayStr)
    const highPriority = tasks.filter(t => t.priority === 'high' && !dueToday.includes(t) && !overdue.includes(t))

    const todaysMeetings = meetings.filter(m => m.date_time_start.startsWith(todayStr))

    if (loading) return <div>Loading your day...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-orange-100 rounded-full text-orange-600">
                    <Sun className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                        Good Morning, {userName.split(' ')[0]}
                    </h2>
                    <p className="text-muted-foreground">Here is your focus for today.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN: TASKS */}
                <div className="lg:col-span-2 space-y-6">

                    {/* OVERDUE WARNING */}
                    {overdue.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <h3 className="flex items-center gap-2 text-red-800 font-bold mb-3">
                                <AlertCircle className="w-5 h-5" /> Overdue Tasks ({overdue.length})
                            </h3>
                            <div className="space-y-2">
                                {overdue.map(t => (
                                    <div key={t.id} className="bg-white p-3 rounded-lg border border-red-100 flex justify-between items-center shadow-sm">
                                        <span className="font-medium text-gray-800">{t.title}</span>
                                        <span className="text-xs text-red-600 font-semibold">{t.due_date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DUE TODAY */}
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-bold mb-3 text-gray-800">
                            <CheckCircle className="w-5 h-5 text-blue-600" /> Due Today
                        </h3>
                        {dueToday.length === 0 ? (
                            <div className="p-8 text-center bg-white rounded-xl border border-dashed text-gray-400">
                                No tasks specifically due today. Great job!
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {dueToday.map(t => (
                                    <div key={t.id} className="glass-card p-4 rounded-xl flex items-center justify-between group hover:border-blue-300 transition-colors">
                                        <div>
                                            <h4 className="font-semibold text-lg">{t.title}</h4>
                                            <p className="text-sm text-gray-500">{t.project_id ? "Project Task" : "General Task"}</p>
                                        </div>
                                        <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                                            {t.estimated_hours ? `${t.estimated_hours}h` : 'No est.'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* HIGH PRIORITY */}
                    {highPriority.length > 0 && (
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-bold mb-3 text-gray-800 mt-6">
                                <AlertCircle className="w-5 h-5 text-amber-500" /> High Priority Backlog
                            </h3>
                            <div className="space-y-3">
                                {highPriority.map(t => (
                                    <div key={t.id} className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                        <span className="font-medium text-gray-800">{t.title}</span>
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded uppercase font-bold">High</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: SCHEDULE */}
                <div className="space-y-6">
                    <div className="glass-card p-6 rounded-2xl bg-gradient-to-b from-white to-blue-50/50">
                        <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-4">
                            <CalendarIcon className="w-5 h-5 text-purple-600" /> Today's Schedule
                        </h3>
                        {todaysMeetings.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No meetings scheduled for today.</p>
                        ) : (
                            <div className="relative border-l-2 border-purple-200 ml-2 space-y-6 pl-6 py-2">
                                {todaysMeetings.map(m => (
                                    <div key={m.id} className="relative">
                                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-purple-500 ring-4 ring-white"></div>
                                        <p className="text-xs font-bold text-purple-600 mb-1">
                                            {new Date(m.date_time_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <h4 className="font-bold text-sm">{m.title}</h4>
                                        <p className="text-xs text-gray-500">{m.mode}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Time Tracking Widget Placeholer (Actually usually on Dashboard, but summarizing here is nice) */}
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="flex items-center gap-2 font-bold text-gray-800 mb-2">
                            <Clock className="w-5 h-5 text-green-600" /> Time Tracked
                        </h3>
                        <div className="text-3xl font-bold text-gray-900">
                            {/* Access time logs if passed, for now static or 0 */}
                            0.0 <span className="text-lg text-gray-500 font-medium">hrs</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
