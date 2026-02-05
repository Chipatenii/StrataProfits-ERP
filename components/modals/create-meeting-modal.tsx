"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Meeting, Client, Project } from "@/lib/types"
import { toast } from "sonner"

interface CreateMeetingModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    meetingToEdit?: Meeting | null
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
    })
    const [clients, setClients] = useState<Client[]>([])
    const [projects, setProjects] = useState<Project[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Load clients/projects on mount
    useEffect(() => {
        if (open) {
            fetchClients()
            fetchProjects()

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
                })
            } else {
                // Reset form for create mode
                setFormData({
                    title: "", date_time_start: "", date_time_end: "", type: "General", mode: "Zoom", client_id: "", project_id: "", location: "", agenda: ""
                })
            }
        }
    }, [open, meetingToEdit])

    const fetchClients = async () => {
        try {
            const res = await fetch("/api/admin/clients")
            if (res.ok) setClients(await res.json())
        } catch (error) {
            console.warn("Failed to load clients for meeting modal:", error)
        }
    }
    const fetchProjects = async () => {
        try {
            const res = await fetch("/api/admin/projects")
            if (res.ok) setProjects(await res.json())
        } catch (error) {
            console.warn("Failed to load projects for meeting modal:", error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.date_time_start) return

        setIsLoading(true)

        try {
            const url = meetingToEdit ? `/api/meetings` : "/api/meetings" // Same URL, different method
            const method = meetingToEdit ? "PATCH" : "POST"

            const payload = {
                ...formData,
                id: meetingToEdit?.id, // Include ID for PATCH
                client_id: formData.client_id || null, // Convert empty string to null
                project_id: formData.project_id || null,
                date_time_end: formData.date_time_end || null
            }

            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || "Failed to create meeting")
            }

            setFormData({
                title: "", date_time_start: "", date_time_end: "", type: "General", mode: "Zoom", client_id: "", project_id: "", location: "", agenda: ""
            })
            onSuccess()
            onOpenChange(false)
            toast.success(meetingToEdit ? "Meeting updated successfully" : "Meeting scheduled successfully")
        } catch (error) {
            console.error("Error creating meeting:", error)
            toast.error(error instanceof Error ? error.message : "Failed to create meeting")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-card border-border/30 max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-primary">{meetingToEdit ? "Edit Meeting" : "Schedule Meeting"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="type">Type</Label>
                            <select
                                id="type"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground"
                            >
                                <option value="General">General</option>
                                <option value="Discovery">Discovery</option>
                                <option value="Review">Review</option>
                                <option value="Strategy">Strategy</option>
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
                                <option value="Zoom">Zoom</option>
                                <option value="GoogleMeet">Google Meet</option>
                                <option value="InPerson">In Person</option>
                                <option value="PhoneCall">Phone Call</option>
                            </select>
                        </div>
                    </div>

                    {/* Dynamic Location Field based on Mode */}
                    {formData.mode === 'InPerson' && (
                        <div>
                            <Label htmlFor="location">Location Address</Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="mt-1 bg-card border-border/30"
                                placeholder="e.g. Client Office"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="client">Client</Label>
                            <select
                                id="client"
                                value={formData.client_id}
                                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
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
                                {projects.filter(p => !formData.client_id || (p as any).client_id === formData.client_id).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="agenda">Agenda / Notes</Label>
                        <textarea
                            id="agenda"
                            value={formData.agenda}
                            onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                            className="mt-1 w-full px-3 py-2 rounded-lg bg-card border border-border/30 text-foreground placeholder-muted-foreground"
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Scheduling..." : "Schedule Meeting"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
