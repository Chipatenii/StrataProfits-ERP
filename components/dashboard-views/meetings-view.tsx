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

    const getModeIcon = (mode: string) => {
        switch (mode) {
            case 'Zoom':
            case 'GoogleMeet':
                return <Video className="w-4 h-4 text-blue-500" />
            case 'InPerson':
                return <MapPin className="w-4 h-4 text-green-500" />
            case 'PhoneCall':
                return <Phone className="w-4 h-4 text-purple-500" />
            default:
                return <Calendar className="w-4 h-4 text-gray-500" />
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Meetings & Logistics</h2>
                    <p className="text-muted-foreground">Schedule and manage your calendar</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Schedule Meeting
                </button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <p>Loading meetings...</p>
                ) : meetings.length === 0 ? (
                    <div className="glass-card p-12 text-center text-muted-foreground">
                        No upcoming meetings scheduled.
                    </div>
                ) : (
                    meetings.map(meeting => (
                        <div key={meeting.id} className="glass-card p-4 rounded-xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-l-4 border-l-blue-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg p-2 min-w-[60px]">
                                    <span className="text-xs font-bold text-blue-700 uppercase">
                                        {new Date(meeting.date_time_start).toLocaleDateString(undefined, { month: 'short' })}
                                    </span>
                                    <span className="text-2xl font-bold text-blue-900">
                                        {new Date(meeting.date_time_start).getDate()}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{meeting.title}</h3>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(meeting.date_time_start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs">
                                            {meeting.mode}
                                        </span>
                                        {meeting.client?.name && (
                                            <span className="flex items-center gap-1 font-medium text-foreground">
                                                <User className="w-3 h-3" />
                                                {meeting.client.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <span className={`px-3 py-1 text-xs rounded-full font-medium ${meeting.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                    meeting.status === 'Completed' ? 'bg-gray-100 text-gray-700' :
                                        meeting.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                            'bg-amber-100 text-amber-700'
                                    }`}>
                                    {meeting.status}
                                </span>
                                <AttachmentList entityType="meeting" entityId={meeting.id} />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <CreateMeetingModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                onSuccess={fetchMeetings}
            />
        </div>
    )
}
