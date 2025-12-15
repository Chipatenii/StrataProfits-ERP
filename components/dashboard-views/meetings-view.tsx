"use client"

import { useState, useEffect } from "react"
import { Plus, Calendar, Video, MapPin, User, Clock, Phone } from "lucide-react"
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
            const response = await fetch("/api/meetings") // This checks permissions
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Meetings & Logistics</h2>
                    <p className="text-muted-foreground">Schedule and manage your calendar</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto justify-center"
                >
                    <Plus className="w-4 h-4" />
                    Schedule Meeting
                </button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : meetings.length === 0 ? (
                    <div className="glass-card p-12 text-center text-muted-foreground">
                        No upcoming meetings scheduled.
                    </div>
                ) : (
                    meetings.map(meeting => (
                        <div key={meeting.id} className="glass-card p-4 rounded-xl flex flex-col gap-4 border-l-4 border-l-blue-500">
                            {/* Mobile: Stacked | Desktop: Row (using md:flex-row) is hard because of grid inside 
                                 Let's allow grid to handle responsive
                             */}
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4 items-start w-full">
                                    {/* Date Box */}
                                    <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg p-2 min-w-[60px] h-min shrink-0">
                                        <span className="text-xs font-bold text-blue-700 uppercase">
                                            {new Date(meeting.date_time_start).toLocaleDateString(undefined, { month: 'short' })}
                                        </span>
                                        <span className="text-2xl font-bold text-blue-900">
                                            {new Date(meeting.date_time_start).getDate()}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-lg leading-tight truncate">{meeting.title}</h3>

                                        <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-muted-foreground mt-2">
                                            <span className="flex items-center gap-1.5 min-w-[100px]">
                                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                                {new Date(meeting.date_time_start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </span>

                                            <span className="flex items-center gap-1.5">
                                                {meeting.mode === 'Zoom' || meeting.mode === 'GoogleMeet' ? <Video className="w-3.5 h-3.5 text-blue-500" /> :
                                                    meeting.mode === 'InPerson' ? <MapPin className="w-3.5 h-3.5 text-green-500" /> :
                                                        <Phone className="w-3.5 h-3.5 text-purple-500" />
                                                }
                                                {meeting.mode}
                                            </span>

                                            {meeting.client?.name && (
                                                <span className="flex items-center gap-1.5 font-medium text-foreground">
                                                    <User className="w-3.5 h-3.5 text-gray-500" />
                                                    {meeting.client.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50 w-full">
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={meeting.status}
                                            onChange={(e) => handleUpdateStatus(meeting.id, e.target.value)}
                                            className={`px-2 py-1 text-xs rounded-full font-medium border-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${meeting.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                meeting.status === 'Completed' ? 'bg-gray-100 text-gray-700' :
                                                    meeting.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
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
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit Meeting"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
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
