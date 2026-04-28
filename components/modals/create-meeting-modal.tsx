"use client"

import { useState, useEffect, useMemo } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Meeting, Client, Project, UserProfile } from "@/lib/types"
import { toast } from "sonner"
import { Clock, Link2 } from "lucide-react"
import { MultiUserSelect } from "@/components/ui/multi-user-select"

interface CreateMeetingModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    meetingToEdit?: Meeting | null
}

const MEETING_TYPES = ["General", "Discovery", "Review", "Strategy", "Renewal"] as const
const MEETING_MODES = ["Zoom", "GoogleMeet", "InPerson", "PhoneCall"] as const

const INPUT_CLS = "mt-1 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
const SELECT_CLS = "mt-1 w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"

function computeDuration(start: string, end: string): string | null {
    if (!start || !end) return null
    const diff = new Date(end).getTime() - new Date(start).getTime()
    if (diff <= 0) return null
    const totalMins = Math.round(diff / 60000)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
}

export function CreateMeetingModal({ open, onOpenChange, onSuccess, meetingToEdit }: CreateMeetingModalProps) {
    const [formData, setFormData] = useState<{
        title: string
        date_time_start: string
        date_time_end: string
        type: string
        mode: string
        client_id: string
        project_id: string
        location: string
        agenda: string
        meeting_notes: string
        meeting_link: string
        attendee_ids: string[]
    }>({
        title: "",
        date_time_start: "",
        date_time_end: "",
        type: "General",
        mode: "Zoom",
        client_id: "",
        project_id: "",
        location: "",
        agenda: "",
        meeting_notes: "",
        meeting_link: "",
        attendee_ids: [],
    })
    const { data: clientsData } = useSWR(open ? "/api/admin/clients" : null)
    const { data: projectsData } = useSWR(open ? "/api/admin/projects" : null)
    const { data: membersData } = useSWR(open ? "/api/admin/members" : null)

    const clients: Client[] = clientsData || []
    const projects: Project[] = projectsData || []
    const members: UserProfile[] = Array.isArray(membersData) ? membersData : membersData?.members ?? []
    const [isLoading, setIsLoading] = useState(false)

    const isEditing = !!meetingToEdit

    const duration = useMemo(
        () => computeDuration(formData.date_time_start, formData.date_time_end),
        [formData.date_time_start, formData.date_time_end]
    )

    const filteredProjects = useMemo(
        () => projects.filter(p => !formData.client_id || p.client_id === formData.client_id),
        [projects, formData.client_id]
    )

    useEffect(() => {
        if (!open) return

        if (meetingToEdit) {
            const editAttendees = (meetingToEdit as Meeting & { attendee_ids?: string[] }).attendee_ids
            const initialAttendees = Array.isArray(editAttendees) && editAttendees.length > 0
                ? editAttendees
                : (meetingToEdit.assigned_to_user_id ? [meetingToEdit.assigned_to_user_id] : [])
            setFormData({
                title: meetingToEdit.title,
                date_time_start: meetingToEdit.date_time_start,
                date_time_end: meetingToEdit.date_time_end || "",
                type: meetingToEdit.type,
                mode: meetingToEdit.mode,
                client_id: meetingToEdit.client_id || "",
                project_id: meetingToEdit.project_id || "",
                location: meetingToEdit.location || "",
                agenda: meetingToEdit.agenda || "",
                meeting_notes: meetingToEdit.meeting_notes || "",
                meeting_link: meetingToEdit.meeting_link || "",
                attendee_ids: initialAttendees,
            })
        } else {
            setFormData({
                title: "", date_time_start: "", date_time_end: "",
                type: "General", mode: "Zoom", client_id: "", project_id: "",
                location: "", agenda: "", meeting_notes: "", meeting_link: "",
                attendee_ids: [],
            })
        }
    }, [open, meetingToEdit])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.title || !formData.date_time_start) {
            toast.error("Title and start time are required.")
            return
        }

        if (formData.date_time_end && new Date(formData.date_time_end) <= new Date(formData.date_time_start)) {
            toast.error("End time must be after start time.")
            return
        }

        setIsLoading(true)

        try {
            const method = isEditing ? "PATCH" : "POST"
            const payload = {
                ...formData,
                id: meetingToEdit?.id,
                client_id: formData.client_id || null,
                project_id: formData.project_id || null,
                date_time_end: formData.date_time_end || null,
                assigned_to_user_id: formData.attendee_ids[0] ?? null,
                attendee_ids: formData.attendee_ids,
                meeting_link: formData.meeting_link || null,
                meeting_notes: formData.meeting_notes || null,
            }

            const response = await fetch("/api/meetings", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || "Failed to save meeting")
            }

            setFormData({
                title: "", date_time_start: "", date_time_end: "", type: "General",
                mode: "Zoom", client_id: "", project_id: "", location: "",
                agenda: "", meeting_notes: "", meeting_link: "", attendee_ids: [],
            })
            onSuccess()
            onOpenChange(false)
            toast.success(isEditing ? "Meeting updated successfully" : "Meeting scheduled successfully")
        } catch (error) {
            console.error("Error saving meeting:", error)
            toast.error(error instanceof Error ? error.message : "Failed to save meeting")
        } finally {
            setIsLoading(false)
        }
    }

    const showLinkField = formData.mode === "Zoom" || formData.mode === "GoogleMeet"
    const showLocationField = formData.mode === "InPerson"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                        {isEditing ? "Edit Meeting" : "Schedule Meeting"}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        {isEditing ? "Update the meeting details below." : "Fill in the details to schedule a new meeting."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className={INPUT_CLS}
                            placeholder="e.g. Kickoff Call"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="start">Start Time *</Label>
                            <Input
                                id="start"
                                type="datetime-local"
                                value={formData.date_time_start}
                                onChange={(e) => setFormData({ ...formData, date_time_start: e.target.value })}
                                className={INPUT_CLS}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="end">End Time</Label>
                            <Input
                                id="end"
                                type="datetime-local"
                                value={formData.date_time_end}
                                onChange={(e) => setFormData({ ...formData, date_time_end: e.target.value })}
                                className={INPUT_CLS}
                                min={formData.date_time_start || undefined}
                            />
                        </div>
                    </div>

                    {duration && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 -mt-2 px-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Duration: <strong className="text-slate-900 dark:text-white">{duration}</strong></span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="type">Type</Label>
                            <select
                                id="type"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className={SELECT_CLS}
                            >
                                {MEETING_TYPES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="mode">Mode</Label>
                            <select
                                id="mode"
                                value={formData.mode}
                                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                                className={SELECT_CLS}
                            >
                                {MEETING_MODES.map(m => (
                                    <option key={m} value={m}>
                                        {m === "GoogleMeet" ? "Google Meet"
                                            : m === "InPerson" ? "In Person"
                                                : m === "PhoneCall" ? "Phone Call"
                                                    : m}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {showLinkField && (
                        <div>
                            <Label htmlFor="meeting_link" className="flex items-center gap-1">
                                <Link2 className="w-3.5 h-3.5" /> Meeting Link
                            </Label>
                            <Input
                                id="meeting_link"
                                type="url"
                                value={formData.meeting_link}
                                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                                className={INPUT_CLS}
                                placeholder={formData.mode === "Zoom" ? "https://zoom.us/j/..." : "https://meet.google.com/..."}
                            />
                        </div>
                    )}

                    {showLocationField && (
                        <div>
                            <Label htmlFor="location">Location Address</Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className={INPUT_CLS}
                                placeholder="e.g. Client Office, 14 Cairo Road"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="client">Client</Label>
                            <select
                                id="client"
                                value={formData.client_id}
                                onChange={(e) => setFormData({ ...formData, client_id: e.target.value, project_id: "" })}
                                className={SELECT_CLS}
                            >
                                <option value="">None</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="project">Project</Label>
                            <select
                                id="project"
                                value={formData.project_id}
                                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                className={SELECT_CLS}
                            >
                                <option value="">None</option>
                                {filteredProjects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="attendees">Attendees (Team Members)</Label>
                        <MultiUserSelect
                            users={members.map(m => ({ id: m.id, full_name: m.full_name, email: m.email, role: m.role }))}
                            selectedIds={formData.attendee_ids}
                            onChange={(ids) => setFormData({ ...formData, attendee_ids: ids })}
                            placeholder="No attendees"
                        />
                    </div>

                    <div>
                        <Label htmlFor="agenda">Agenda / Notes</Label>
                        <textarea
                            id="agenda"
                            value={formData.agenda}
                            onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                            rows={3}
                            placeholder="Key discussion points, objectives..."
                        />
                    </div>

                    {isEditing && (
                        <div>
                            <Label htmlFor="meeting_notes">
                                Meeting Notes
                                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 font-normal">(post-meeting)</span>
                            </Label>
                            <textarea
                                id="meeting_notes"
                                value={formData.meeting_notes}
                                onChange={(e) => setFormData({ ...formData, meeting_notes: e.target.value })}
                                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                                rows={3}
                                placeholder="Outcomes, decisions, action items..."
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                        >
                            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
                            {isLoading
                                ? (isEditing ? "Updating..." : "Scheduling...")
                                : (isEditing ? "Update Meeting" : "Schedule Meeting")
                            }
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
