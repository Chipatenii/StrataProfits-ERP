"use client"

import { useState, useEffect } from "react"
import { Plus, Video, MapPin, User, Clock, Phone, CalendarDays, Edit2 } from "lucide-react"
import { Meeting } from "@/lib/types"
import { CreateMeetingModal } from "@/components/modals/create-meeting-modal"
import { AttachmentList } from "@/components/attachment-list"

export function MeetingsView() {
    const [meetings, setMeetings] = useState<Meeting[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)

    useEffect(() => {
        fetchMeetings()
    }, [])

    const fetchMeetings = async () => {
        try {
            const response = await fetch("/api/meetings")
            if (response.ok) {
                const data = await response.json()
                setMeetings(data)
            }
        } catch (error) {
            console.error("Error loading meetings:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            const response = await fetch('/api/meetings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            })

            if (response.ok) {
                fetchMeetings()
            }
        } catch (error) {
            console.error("Error updating status:", error)
        }
    }

    const upcomingCount = meetings.filter(m => m.status !== 'Completed' && m.status !== 'Cancelled').length
    const completedCount = meetings.filter(m => m.status === 'Completed').length

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 p-8 md:p-10 text-white shadow-2xl shadow-blue-500/30">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <CalendarDays className="w-5 h-5 text-cyan-200" />
                            <span className="text-sm font-medium text-cyan-100 uppercase tracking-wider">Calendar</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">Meetings & Logistics</h1>
                        <p className="text-cyan-100/80 text-lg">Schedule and manage your calendar</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl hover:shadow-lg hover:bg-blue-50 active:scale-[0.98] transition-all duration-200 font-bold shadow-lg"
                    >
                        <Plus className="w-5 h-5" />
                        Schedule Meeting
                    </button>
                </div>

                {/* Quick Stats in Hero */}
                <div className="relative z-10 grid grid-cols-3 gap-4 mt-8">
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{meetings.length}</p>
                        <p className="text-sm text-cyan-100/80">Total</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{upcomingCount}</p>
                        <p className="text-sm text-cyan-100/80">Upcoming</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{completedCount}</p>
                        <p className="text-sm text-cyan-100/80">Completed</p>
                    </div>
                </div>
            </div>

            {/* Meetings List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                        <p className="text-muted-foreground">Loading meetings...</p>
                    </div>
                ) : meetings.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800">
                        <CalendarDays className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No meetings scheduled</h3>
                        <p className="text-muted-foreground">Schedule your first meeting to get started</p>
                    </div>
                ) : (
                    meetings.map(meeting => (
                        <div
                            key={meeting.id}
                            className="group bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-black/5 dark:shadow-black/20 border-l-4 border-l-blue-500 border border-slate-200/50 dark:border-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                        >
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4 items-start w-full">
                                    {/* Date Box */}
                                    <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-2xl p-3 min-w-[70px] h-min shrink-0 shadow-lg shadow-blue-500/25">
                                        <span className="text-xs font-bold uppercase">
                                            {new Date(meeting.date_time_start).toLocaleDateString(undefined, { month: 'short' })}
                                        </span>
                                        <span className="text-2xl font-bold">
                                            {new Date(meeting.date_time_start).getDate()}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg text-foreground leading-tight truncate">{meeting.title}</h3>

                                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-3">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                <Clock className="w-4 h-4 text-blue-500" />
                                                {new Date(meeting.date_time_start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </span>

                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg ${meeting.mode === 'Zoom' || meeting.mode === 'GoogleMeet'
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                                : meeting.mode === 'InPerson'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                                }`}>
                                                {meeting.mode === 'Zoom' || meeting.mode === 'GoogleMeet' ? <Video className="w-4 h-4" /> :
                                                    meeting.mode === 'InPerson' ? <MapPin className="w-4 h-4" /> :
                                                        <Phone className="w-4 h-4" />
                                                }
                                                {meeting.mode}
                                            </span>

                                            {meeting.client?.name && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium text-foreground">
                                                    <User className="w-4 h-4 text-slate-500" />
                                                    {meeting.client.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 w-full">
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={meeting.status}
                                            onChange={(e) => handleUpdateStatus(meeting.id, e.target.value)}
                                            className={`px-3 py-1.5 text-xs rounded-lg font-semibold border-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-colors ${meeting.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' :
                                                meeting.status === 'Completed' ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                                                    meeting.status === 'Cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                                                        'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                                }`}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Approved">Approved</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>

                                        <button
                                            onClick={() => {
                                                setEditingMeeting(meeting)
                                                setShowCreateModal(true)
                                            }}
                                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                                            title="Edit Meeting"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <AttachmentList entityType="meeting" entityId={meeting.id} />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <CreateMeetingModal
                open={showCreateModal}
                onOpenChange={(open) => {
                    setShowCreateModal(open)
                    if (!open) setEditingMeeting(null)
                }}
                onSuccess={() => {
                    fetchMeetings()
                    setEditingMeeting(null)
                }}
                meetingToEdit={editingMeeting}
            />
        </div>
    )
}
