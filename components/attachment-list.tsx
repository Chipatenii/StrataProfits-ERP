"use client"

import { useState, useEffect } from "react"
import { Paperclip, Link as LinkIcon, ExternalLink } from "lucide-react"
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
    trigger?: React.ReactNode
}

export function AttachmentList({ entityType, entityId, trigger }: AttachmentListProps) {
    const [attachments, setAttachments] = useState<Attachment[]>([])
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
        <button className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Paperclip className="w-3.5 h-3.5" />
            {attachments.length > 0 && <span className="text-xs font-medium">{attachments.length}</span>}
        </button>
    )

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                        <Paperclip className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                        Attachments
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {attachments.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No attachments yet.</p>
                        ) : (
                            attachments.map(att => (
                                <div key={att.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                                            <LinkIcon className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <a
                                                href={att.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block text-sm font-medium text-slate-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline truncate"
                                            >
                                                {att.file_name}
                                            </a>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Added by {att.uploaded_by?.full_name || "Unknown"}
                                            </p>
                                        </div>
                                    </div>
                                    <a
                                        href={att.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Add link</h4>
                        <form onSubmit={handleAdd} className="space-y-2.5">
                            <Input
                                placeholder="File name / description"
                                value={newFile.name}
                                onChange={e => setNewFile({ ...newFile, name: e.target.value })}
                                className="h-9 text-sm rounded-lg border-slate-200 dark:border-slate-800"
                            />
                            <Input
                                placeholder="https://..."
                                value={newFile.url}
                                onChange={e => setNewFile({ ...newFile, url: e.target.value })}
                                className="h-9 text-sm rounded-lg border-slate-200 dark:border-slate-800"
                            />
                            <button
                                type="submit"
                                disabled={isAdding || !newFile.name || !newFile.url}
                                className="w-full inline-flex justify-center items-center px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                                {isAdding ? "Adding..." : "Add attachment"}
                            </button>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
