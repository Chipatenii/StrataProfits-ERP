"use client"

import { useState, useEffect } from "react"
import { Paperclip, Link as LinkIcon, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Attachment {
    id: string
    file_name: string
    file_url: string
    created_at: string
    uploaded_by?: {
        full_name: string
    }
}

interface AttachmentListProps {
    entityType: "meeting" | "deal" | "task"
    entityId: string
    trigger?: React.ReactNode // Custom trigger button
}

export function AttachmentList({ entityType, entityId, trigger }: AttachmentListProps) {
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [newFile, setNewFile] = useState({ name: "", url: "" })

    useEffect(() => {
        if (entityId) fetchAttachments()
    }, [entityId])

    const fetchAttachments = async () => {
        try {
            const res = await fetch(`/api/attachments?entity_type=${entityType}&entity_id=${entityId}`)
            if (res.ok) setAttachments(await res.json())
        } catch (e) {
            console.error("Failed to load attachments")
        }
    }

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newFile.name || !newFile.url) return

        setIsAdding(true)
        try {
            const res = await fetch("/api/attachments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entity_type: entityType,
                    entity_id: entityId,
                    file_name: newFile.name,
                    file_url: newFile.url
                })
            })

            if (res.ok) {
                setNewFile({ name: "", url: "" })
                fetchAttachments()
            }
        } catch (e) {
            console.error("Failed to add attachment")
        } finally {
            setIsAdding(false)
        }
    }

    const defaultTrigger = (
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground">
            <Paperclip className="w-3 h-3" />
            <span className="text-xs">{attachments.length > 0 ? attachments.length : ''}</span>
        </Button>
    )

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="glass-card max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        Attachments
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* List */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {attachments.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No attachments yet.</p>
                        ) : (
                            attachments.map(att => (
                                <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-card/50 border border-border/50">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <LinkIcon className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <a
                                                href={att.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block text-sm font-medium hover:underline truncate"
                                            >
                                                {att.file_name}
                                            </a>
                                            <p className="text-xs text-muted-foreground">
                                                Added by {att.uploaded_by?.full_name || 'Unknown'}
                                            </p>
                                        </div>
                                    </div>
                                    <a
                                        href={att.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add Form */}
                    <div className="pt-4 border-t border-border/50">
                        <h4 className="text-sm font-medium mb-3">Add Link</h4>
                        <form onSubmit={handleAdd} className="space-y-3">
                            <Input
                                placeholder="File Name / Description"
                                value={newFile.name}
                                onChange={e => setNewFile({ ...newFile, name: e.target.value })}
                                className="h-8 text-sm"
                            />
                            <Input
                                placeholder="https://..."
                                value={newFile.url}
                                onChange={e => setNewFile({ ...newFile, url: e.target.value })}
                                className="h-8 text-sm"
                            />
                            <Button type="submit" size="sm" className="w-full" disabled={isAdding || !newFile.name || !newFile.url}>
                                {isAdding ? "Adding..." : "Add Attachment"}
                            </Button>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
