"use client"

import { useState, useEffect, useMemo } from "react"
import useSWR from "swr"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Meeting, Client, Project, UserProfile } from "@/lib/types"
import { toast } from "sonner"
import { Clock, Link2 } from "lucide-react"

interface CreateMeetingModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    meetingToEdit?: Meeting | null
}

const MEETING_TYPES = ["General", "Discovery", "Review", "Strategy", "Renewal"] as const
const MEETING_MODES = ["Zoom", "GoogleMeet", "InPerson", "PhoneCall"] as const

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
    const [formData, setFormData] = useState({
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
        assigned_to_user_id: "",
    })
    const { data: clientsData } = useSWR(open ? "/api/admin/clients" : null)
    const { data: projectsData } = useSWR(open ? "/api/admin/projects" : null)
    const { data: membersData } = useSWR(open ? "/api/admin/members" : null)

    const clients: Client[] = clientsData || []
    const projects: Project[] = projectsData || []
    const members: UserProfile[] = Array.isArray(membersData) ? membersData : membersData?.members ?? []
    const [isLoading, setIsLoading] = useState(false)

    const isEditing = !!meetingToEdit

    // Derived: computed duration
    const duration = useMemo(
        () => computeDuration(formData.date_time_start, formData.date_time_end),
        [formData.date_time_start, formData.date_time_end]
    )

    // Filtered projects by selected client
    const filteredProjects = useMemo(
        () => projects.filter(p => !formData.client_id || p.client_id === formData.client_id),
        [projects, formData.client_id]
    )

    useEffect(() => {
        if (!open) return

        if (meetingToEdit) {
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
                meeting_link: (meetingToEdit as any).meeting_link || "",
                assigned_to_user_id: meetingToEdit.assigned_to_user_id || "",
            })
        } else {
            setFormData({
                title: "", date_time_start: "", date_time_end: "",
                type: "General", mode: "Zoom", client_id: "", project_id: "",
                location: "", agenda: "", meeting_notes: "", meeting_link: "",
                assigned_to_user_id: "",
            })
        }
    }, [open, meetingToEdit])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.title || !formData.date_time_start) {
            toast.error("Title and start time are required.")
            return
        }

        // Validate end time is after start time
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
                assigned_to_user_id: formData.assigned_to_user_id || null,
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
                agenda: "", meeting_notes: "", meeting_link: "", assigned_to_user_id: "",
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
            <DialogContent className="glass-card border-border/30 max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-primary">
                        {isEditing ? "Edit Meeting" : "Schedule Meeting"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Title */}
                    <div>
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="mt-1 bg-card border-border/30"
                            placeholder="e.g. Kickoff Call"
                            required
                        />
                    </div>

                    {/* Start & End Times */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="start">Start Time *</Label>
                            <Input
                                id="start"
                                type="datetime-local"
                                value={formData.date_time_start}
                                onChange={(e) => setFormData({ ...formData, date_time_start: e.target.value })}
                                className="mt-1 bg-card border-border/30"
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
                                className="mt-1 bg-card border-border/30"
                                min={formData.date_time_start || undefined}
                            />
                        </div>
                    </div>

                    {/* Duration hint */}
                    {duration && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground -mt-2 px-1">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span>Duration: <strong className="text-foreground">{duration}</strong></span>
                        </div>
                    )}

                    {/* Type & Mode */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="type">Type</Label>
                            <select
                                id="type"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
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
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
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

                    {/* Meeting Link (Zoom / Google Meet) */}
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
                                className="mt-1 bg-card border-border/30"
                                placeholder={formData.mode === "Zoom" ? "https://zoom.us/j/..." : "https://meet.google.com/..."}
                            />
                        </div>
                    )}

                    {/* Location (In Person) */}
                    {showLocationField && (
                        <div>
                            <Label htmlFor="location">Location Address</Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="mt-1 bg-card border-border/30"
                                placeholder="e.g. Client Office, 14 Cairo Road"
                            />
                        </div>
                    )}

                    {/* Client & Project */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="client">Client</Label>
                            <select
                                id="client"
                                value={formData.client_id}
                                onChange={(e) => setFormData({ ...formData, client_id: e.target.value, project_id: "" })}
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
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
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
                            >
                                <option value="">None</option>
                                {filteredProjects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Assign To */}
                    <div>
                        <Label htmlFor="assigned_to">Assign To (Team Member)</Label>
                        <select
                            id="assigned_to"
                            value={formData.assigned_to_user_id}
                            onChange={(e) => setFormData({ ...formData, assigned_to_user_id: e.target.value })}
                            className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
                        >
                            <option value="">Unassigned</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.full_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Agenda */}
                    <div>
                        <Label htmlFor="agenda">Agenda / Notes</Label>
                        <textarea
                            id="agenda"
                            value={formData.agenda}
                            onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                            className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground placeholder:text-muted-foreground resize-none"
                            rows={3}
                            placeholder="Key discussion points, objectives..."
                        />
                    </div>

                    {/* Meeting Notes — only in edit mode (post-meeting) */}
                    {isEditing && (
                        <div>
                            <Label htmlFor="meeting_notes">
                                Meeting Notes
                                <span className="ml-2 text-xs text-muted-foreground font-normal">(post-meeting)</span>
                            </Label>
                            <textarea
                                id="meeting_notes"
                                value={formData.meeting_notes}
                                onChange={(e) => setFormData({ ...formData, meeting_notes: e.target.value })}
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground placeholder:text-muted-foreground resize-none"
                                rows={3}
                                placeholder="Outcomes, decisions, action items..."
                            />
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading
                                ? (isEditing ? "Updating…" : "Scheduling…")
                                : (isEditing ? "Update Meeting" : "Schedule Meeting")
                            }
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
