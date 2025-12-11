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
                            <div className="flex flex-col md:flex-row gap-4 justify-between">
                                <div className="flex gap-4 items-start">
                                    {/* Date Box */}
                                    <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg p-2 min-w-[60px] h-min">
                                        <span className="text-xs font-bold text-blue-700 uppercase">
                                            {new Date(meeting.date_time_start).toLocaleDateString(undefined, { month: 'short' })}
                                        </span>
                                        <span className="text-2xl font-bold text-blue-900">
                                            {new Date(meeting.date_time_start).getDate()}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">{meeting.title}</h3>

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
                                <div className="flex items-center justify-between md:justify-end gap-3 mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-border/50">
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
