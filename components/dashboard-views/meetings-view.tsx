"use client"

import { useState, useEffect, useMemo } from "react"
import { Plus, Video, MapPin, User, Clock, Phone, CalendarDays, Edit2, Trash2, Search, Link2 } from "lucide-react"
import { Meeting } from "@/lib/types"
import { CreateMeetingModal } from "@/components/modals/create-meeting-modal"
import { AttachmentList } from "@/components/attachment-list"
import { toast } from "sonner"

type FilterTab = "All" | "Upcoming" | "Completed" | "Cancelled"

function getRelativeDateLabel(dateStr: string): { label: string; className: string } | null {
    const now = new Date()
    const date = new Date(dateStr)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)

    if (diffDays < 0) return { label: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" }
    if (diffDays === 0) return { label: "Today", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" }
    if (diffDays === 1) return { label: "Tomorrow", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" }
    if (diffDays <= 7) return { label: `In ${diffDays} days`, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" }
    return null
}

function computeDuration(start: string, end: string | null): string | null {
    if (!end) return null
    const diff = new Date(end).getTime() - new Date(start).getTime()
    if (diff <= 0) return null
    const totalMins = Math.round(diff / 60000)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
}

export function MeetingsView() {
    const [meetings, setMeetings] = useState<Meeting[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
    const [search, setSearch] = useState("")
    const [activeTab, setActiveTab] = useState<FilterTab>("All")
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => { fetchMeetings() }, [])

    const fetchMeetings = async () => {
        try {
            const response = await fetch("/api/meetings")
            if (response.ok) {
                setMeetings(await response.json())
            }
        } catch (error) {
            console.error("Error loading meetings:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        // Optimistic update
        setMeetings(prev => prev.map(m => m.id === id ? { ...m, status: newStatus as Meeting["status"] } : m))

        try {
            const response = await fetch("/api/meetings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus })
            })
            if (!response.ok) throw new Error("Failed to update status")
            toast.success(`Status updated to ${newStatus}`)
        } catch (error) {
            console.error("Error updating status:", error)
            toast.error("Failed to update status")
            fetchMeetings() // Revert on failure
        }
    }

    const handleDelete = async (meeting: Meeting) => {
        toast(`Delete "${meeting.title}"?`, {
            description: "This action cannot be undone.",
            action: {
                label: "Delete",
                onClick: async () => {
                    setDeletingId(meeting.id)
                    // Optimistic remove
                    setMeetings(prev => prev.filter(m => m.id !== meeting.id))
                    try {
                        const res = await fetch(`/api/meetings?id=${meeting.id}`, { method: "DELETE" })
                        if (!res.ok) throw new Error()
                        toast.success("Meeting deleted")
                    } catch {
                        toast.error("Failed to delete meeting")
                        fetchMeetings() // Restore on failure
                    } finally {
                        setDeletingId(null)
                    }
                }
            },
            cancel: { label: "Cancel", onClick: () => {} },
        })
    }

    // Derived counts
    const upcomingCount = meetings.filter(m => m.status !== "Completed" && m.status !== "Cancelled").length
    const completedCount = meetings.filter(m => m.status === "Completed").length
    const cancelledCount = meetings.filter(m => m.status === "Cancelled").length

    // Filtered list
    const filteredMeetings = useMemo(() => {
        let list = meetings
        if (activeTab === "Upcoming") list = list.filter(m => m.status !== "Completed" && m.status !== "Cancelled")
        else if (activeTab === "Completed") list = list.filter(m => m.status === "Completed")
        else if (activeTab === "Cancelled") list = list.filter(m => m.status === "Cancelled")

        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(m =>
                m.title.toLowerCase().includes(q) ||
                m.client?.name?.toLowerCase().includes(q) ||
                m.project?.name?.toLowerCase().includes(q)
            )
        }
        return list
    }, [meetings, activeTab, search])

    const TABS: FilterTab[] = ["All", "Upcoming", "Completed", "Cancelled"]

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 p-8 md:p-10 text-white shadow-2xl shadow-blue-500/30">
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

                {/* Quick Stats */}
                <div className="relative z-10 grid grid-cols-4 gap-3 mt-8">
                    {[
                        { value: meetings.length, label: "Total" },
                        { value: upcomingCount, label: "Upcoming" },
                        { value: completedCount, label: "Completed" },
                        { value: cancelledCount, label: "Cancelled" },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                            <p className="text-3xl font-bold">{stat.value}</p>
                            <p className="text-sm text-cyan-100/80">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Search + Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by title, client or project…"
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1 p-1 bg-card border border-border/30 rounded-xl">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab
                                    ? "bg-blue-600 text-white shadow"
                                    : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Meetings List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                        <p className="text-muted-foreground">Loading meetings...</p>
                    </div>
                ) : filteredMeetings.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800">
                        <CalendarDays className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            {search ? "No meetings match your search" : "No meetings scheduled"}
                        </h3>
                        <p className="text-muted-foreground">
                            {search ? "Try a different keyword." : "Schedule your first meeting to get started."}
                        </p>
                    </div>
                ) : (
                    filteredMeetings.map(meeting => {
                        const relativeBadge = getRelativeDateLabel(meeting.date_time_start)
                        const duration = computeDuration(meeting.date_time_start, meeting.date_time_end)
                        const agendaSnippet = meeting.agenda
                            ? (meeting.agenda.length > 90 ? meeting.agenda.slice(0, 90) + "…" : meeting.agenda)
                            : null
                        const assignedName = (meeting as any).assigned_to?.full_name as string | undefined

                        return (
                            <div
                                key={meeting.id}
                                className="group bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-black/5 dark:shadow-black/20 border-l-4 border-l-blue-500 border border-slate-200/50 dark:border-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                            >
                                <div className="flex flex-col gap-4">

                                    {/* Top row: date + content + badges */}
                                    <div className="flex gap-4 items-start w-full">
                                        {/* Date Box */}
                                        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-2xl p-3 min-w-[70px] h-min shrink-0 shadow-lg shadow-blue-500/25">
                                            <span className="text-xs font-bold uppercase">
                                                {new Date(meeting.date_time_start).toLocaleDateString(undefined, { month: "short" })}
                                            </span>
                                            <span className="text-2xl font-bold">
                                                {new Date(meeting.date_time_start).getDate()}
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-2 flex-wrap">
                                                <h3 className="font-bold text-lg text-foreground leading-tight truncate max-w-xs">
                                                    {meeting.title}
                                                </h3>
                                                {relativeBadge && (
                                                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${relativeBadge.className}`}>
                                                        {relativeBadge.label}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-2">
                                                {/* Time */}
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                    <Clock className="w-4 h-4 text-blue-500" />
                                                    {new Date(meeting.date_time_start).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                                                    {duration && <span className="text-xs text-muted-foreground">· {duration}</span>}
                                                </span>

                                                {/* Mode */}
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg ${
                                                    meeting.mode === "Zoom" || meeting.mode === "GoogleMeet"
                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                                        : meeting.mode === "InPerson"
                                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                                                }`}>
                                                    {meeting.mode === "Zoom" || meeting.mode === "GoogleMeet" ? <Video className="w-4 h-4" />
                                                        : meeting.mode === "InPerson" ? <MapPin className="w-4 h-4" />
                                                            : <Phone className="w-4 h-4" />}
                                                    {meeting.mode === "GoogleMeet" ? "Google Meet"
                                                        : meeting.mode === "InPerson" ? "In Person"
                                                            : meeting.mode === "PhoneCall" ? "Phone Call"
                                                                : meeting.mode}
                                                </span>

                                                {/* Meeting link */}
                                                {(meeting as any).meeting_link && (
                                                    <a
                                                        href={(meeting as any).meeting_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-lg hover:underline"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <Link2 className="w-4 h-4" />
                                                        Join
                                                    </a>
                                                )}

                                                {/* Client */}
                                                {meeting.client?.name && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium text-foreground">
                                                        <User className="w-4 h-4 text-slate-500" />
                                                        {meeting.client.name}
                                                    </span>
                                                )}

                                                {/* Assigned To */}
                                                {assignedName && (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 rounded-lg">
                                                        <User className="w-4 h-4" />
                                                        {assignedName}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Agenda snippet */}
                                            {agendaSnippet && (
                                                <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic">
                                                    {agendaSnippet}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status & Actions */}
                                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 w-full">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={meeting.status}
                                                onChange={(e) => handleUpdateStatus(meeting.id, e.target.value)}
                                                className={`px-3 py-1.5 text-xs rounded-lg font-semibold border-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-colors ${
                                                    meeting.status === "Approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                                        : meeting.status === "Completed" ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                            : meeting.status === "Cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                                                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                                }`}
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <option value="Proposed">Proposed</option>
                                                <option value="Approved">Approved</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>

                                            {/* Edit */}
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

                                            {/* Delete */}
                                            <button
                                                onClick={() => handleDelete(meeting)}
                                                disabled={deletingId === meeting.id}
                                                className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors disabled:opacity-40"
                                                title="Delete Meeting"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <AttachmentList entityType="meeting" entityId={meeting.id} />
                                    </div>
                                </div>
                            </div>
                        )
                    })
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
