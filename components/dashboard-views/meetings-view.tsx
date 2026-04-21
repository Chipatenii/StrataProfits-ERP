"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
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

    if (diffDays < 0) return { label: "Overdue", className: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" }
    if (diffDays === 0) return { label: "Today", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" }
    if (diffDays === 1) return { label: "Tomorrow", className: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" }
    if (diffDays <= 7) return { label: `In ${diffDays} days`, className: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" }
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
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
    const [search, setSearch] = useState("")
    const [activeTab, setActiveTab] = useState<FilterTab>("All")
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const fetcher = (url: string) => fetch(url).then(r => r.json())
    const { data: meetings = [], isLoading: loading, mutate: fetchMeetings } = useSWR<Meeting[]>("/api/meetings", fetcher)

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        fetchMeetings(meetings.map(m => m.id === id ? { ...m, status: newStatus as Meeting["status"] } : m), false)

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
            fetchMeetings()
        }
    }

    const handleDelete = async (meeting: Meeting) => {
        toast(`Delete "${meeting.title}"?`, {
            description: "This action cannot be undone.",
            action: {
                label: "Delete",
                onClick: async () => {
                    setDeletingId(meeting.id)
                    fetchMeetings(meetings.filter(m => m.id !== meeting.id), false)
                    try {
                        const res = await fetch(`/api/meetings?id=${meeting.id}`, { method: "DELETE" })
                        if (!res.ok) throw new Error()
                        toast.success("Meeting deleted")
                    } catch {
                        toast.error("Failed to delete meeting")
                        fetchMeetings()
                    } finally {
                        setDeletingId(null)
                    }
                }
            },
            cancel: { label: "Cancel", onClick: () => {} },
        })
    }

    const upcomingCount = meetings.filter(m => m.status !== "Completed" && m.status !== "Cancelled").length
    const completedCount = meetings.filter(m => m.status === "Completed").length
    const cancelledCount = meetings.filter(m => m.status === "Cancelled").length

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
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Meetings</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Schedule and manage your calendar.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors font-semibold text-sm shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Schedule meeting
                </button>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { value: meetings.length, label: "Total" },
                    { value: upcomingCount, label: "Upcoming" },
                    { value: completedCount, label: "Completed" },
                    { value: cancelledCount, label: "Cancelled" },
                ].map(stat => (
                    <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{stat.label}</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Search + filter toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by title, client or project..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                    />
                </div>

                <div className="flex gap-0.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab
                                    ? "bg-emerald-700 text-white"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Meetings list */}
            <div className="space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Loading meetings...</p>
                    </div>
                ) : filteredMeetings.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800">
                        <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                            {search ? "No meetings match your search" : "No meetings scheduled"}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
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
                                className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/40 transition-colors"
                            >
                                <div className="flex flex-col gap-4">
                                    <div className="flex gap-4 items-start w-full">
                                        {/* Date box */}
                                        <div className="flex flex-col items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg p-2.5 min-w-[60px] h-min shrink-0">
                                            <span className="text-[10px] font-semibold uppercase tracking-wide">
                                                {new Date(meeting.date_time_start).toLocaleDateString(undefined, { month: "short" })}
                                            </span>
                                            <span className="text-xl font-bold">
                                                {new Date(meeting.date_time_start).getDate()}
                                            </span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-2 flex-wrap">
                                                <h3 className="font-semibold text-base text-slate-900 dark:text-white leading-tight truncate max-w-xs">
                                                    {meeting.title}
                                                </h3>
                                                {relativeBadge && (
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 ${relativeBadge.className}`}>
                                                        {relativeBadge.label}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-1.5 text-xs mt-2">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
                                                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                                                    {new Date(meeting.date_time_start).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                                                    {duration && <span className="text-slate-500 dark:text-slate-400">· {duration}</span>}
                                                </span>

                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${
                                                    meeting.mode === "Zoom" || meeting.mode === "GoogleMeet"
                                                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                                        : meeting.mode === "InPerson"
                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                            : "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                                                }`}>
                                                    {meeting.mode === "Zoom" || meeting.mode === "GoogleMeet" ? <Video className="w-3.5 h-3.5" />
                                                        : meeting.mode === "InPerson" ? <MapPin className="w-3.5 h-3.5" />
                                                            : <Phone className="w-3.5 h-3.5" />}
                                                    {meeting.mode === "GoogleMeet" ? "Google Meet"
                                                        : meeting.mode === "InPerson" ? "In person"
                                                            : meeting.mode === "PhoneCall" ? "Phone call"
                                                                : meeting.mode}
                                                </span>

                                                {(meeting as any).meeting_link && (
                                                    <a
                                                        href={(meeting as any).meeting_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-md hover:underline"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <Link2 className="w-3.5 h-3.5" />
                                                        Join
                                                    </a>
                                                )}

                                                {meeting.client?.name && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-medium">
                                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                                        {meeting.client.name}
                                                    </span>
                                                )}

                                                {assignedName && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 rounded-md">
                                                        <User className="w-3.5 h-3.5" />
                                                        {assignedName}
                                                    </span>
                                                )}
                                            </div>

                                            {agendaSnippet && (
                                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                                                    {agendaSnippet}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 w-full">
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={meeting.status}
                                                onChange={(e) => handleUpdateStatus(meeting.id, e.target.value)}
                                                className={`px-2.5 py-1 text-xs rounded-md font-semibold border-none focus:ring-2 focus:ring-emerald-600/20 cursor-pointer ${
                                                    meeting.status === "Approved" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                        : meeting.status === "Completed" ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                            : meeting.status === "Cancelled" ? "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                                                                : "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                                }`}
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <option value="Proposed">Proposed</option>
                                                <option value="Approved">Approved</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>

                                            <button
                                                onClick={() => {
                                                    setEditingMeeting(meeting)
                                                    setShowCreateModal(true)
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md transition-colors"
                                                title="Edit meeting"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => handleDelete(meeting)}
                                                disabled={deletingId === meeting.id}
                                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors disabled:opacity-40"
                                                title="Delete meeting"
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
