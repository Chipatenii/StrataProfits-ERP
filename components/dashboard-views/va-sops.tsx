"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import useSWR from "swr"
import {
    Plus, Search, FileText, Pencil, Trash2, Tag, Link2,
    Clock, X, MoreVertical, ExternalLink,
    BookOpen, FolderOpen
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SOP } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const CATEGORIES = ["General", "HR", "Sales", "Tech", "Client Ops", "Finance", "Marketing", "Operations", "Other"] as const

function stripMarkdown(text: string): string {
    return text
        .replace(/#{1,6}\s+/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`{1,3}([\s\S]*?)`{1,3}/g, "$1")
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
        .replace(/^[-*+]\s+/gm, "")
        .replace(/^\d+\.\s+/gm, "")
        .replace(/\n{2,}/g, " ")
        .trim()
}

function readingTime(content: string): string {
    const words = content.trim().split(/\s+/).length
    const mins = Math.max(1, Math.round(words / 200))
    return `${mins} min read`
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
}

function renderMarkdown(md: string): string {
    const escaped = escapeHtml(md)
    return escaped
        .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-5 mb-2 text-slate-900 dark:text-white">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-2 text-slate-900 dark:text-white">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-slate-900 dark:text-white">$1</h1>')
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
        .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre class="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 my-4 overflow-x-auto text-sm font-mono whitespace-pre">$1</pre>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-emerald-700 dark:text-emerald-400 underline hover:no-underline">$1</a>')
        .replace(/^---$/gm, '<hr class="border-slate-200 dark:border-slate-800 my-4" />')
        .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc list-outside">$1</li>')
        .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal list-outside">$1</li>')
        .replace(/^(?!<)(.+)$/gm, '<p class="mb-3 leading-relaxed text-slate-600 dark:text-slate-400">$1</p>')
        .replace(/<p class="[^"]+"><\/p>/g, '')
}

interface SOPLink { title: string; url: string }

interface SOPFormData {
    title: string
    content: string
    category: string
    tags: string
    links: SOPLink[]
}

const EMPTY_FORM: SOPFormData = {
    title: "",
    content: "",
    category: "General",
    tags: "",
    links: [],
}

function SOPCard({
    sop,
    canWrite,
    onView,
    onEdit,
    onDelete,
    activeTagFilter,
    onTagClick,
}: {
    sop: SOP
    canWrite: boolean
    onView: () => void
    onEdit: () => void
    onDelete: () => void
    activeTagFilter: string | null
    onTagClick: (tag: string) => void
}) {
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const excerpt = sop.content ? stripMarkdown(sop.content).slice(0, 120) + (sop.content.length > 120 ? "…" : "") : "No content yet."
    const rt = sop.content ? readingTime(sop.content) : null

    return (
        <div
            onClick={onView}
            className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 transition-colors cursor-pointer group flex flex-col gap-3"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                        {sop.category || "General"}
                    </span>
                </div>
                {canWrite && (
                    <div ref={menuRef} className="relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setMenuOpen(v => !v)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors opacity-0 group-hover:opacity-100"
                            aria-label="SOP actions"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 top-8 z-50 w-36 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 py-1 overflow-hidden">
                                <button
                                    onClick={() => { setMenuOpen(false); onEdit() }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                    onClick={() => { setMenuOpen(false); onDelete() }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-1">
                <h3 className="font-semibold text-base mb-1 text-slate-900 dark:text-white leading-snug">
                    {sop.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{excerpt}</p>
            </div>

            {sop.tags && sop.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5" onClick={e => e.stopPropagation()}>
                    {sop.tags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => onTagClick(tag)}
                            className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${activeTagFilter === tag
                                ? "bg-emerald-700 text-white"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400"
                                }`}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                {rt && (
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {rt}
                    </span>
                )}
                <span className="ml-auto">
                    {new Date(sop.updated_at || sop.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </span>
            </div>
        </div>
    )
}

export function VASOPs() {
    const supabase = createClient()
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
    const [tagFilter, setTagFilter] = useState<string | null>(null)
    const [canWrite, setCanWrite] = useState(false)

    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingSOP, setEditingSOP] = useState<SOP | null>(null)
    const [form, setForm] = useState<SOPFormData>(EMPTY_FORM)
    const [linkInput, setLinkInput] = useState({ title: "", url: "" })
    const [saving, setSaving] = useState(false)

    const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data }) => {
                setCanWrite(data?.role === "admin" || data?.role === "virtual_assistant")
            })
        })
    }, [supabase])

    const fetcher = (url: string) => fetch(url).then(r => r.json())
    const { data: sopsData = [], isLoading: loading, mutate: fetchSOPs } = useSWR<SOP[]>("/api/sops", fetcher)
    const sops = Array.isArray(sopsData) ? sopsData : []

    const allCategories = Array.from(new Set(sops.map(s => s.category || "General"))).sort()

    const filteredSops = sops.filter(s => {
        if (categoryFilter && (s.category || "General") !== categoryFilter) return false
        if (tagFilter && !(s.tags || []).includes(tagFilter)) return false
        if (search) {
            const q = search.toLowerCase()
            const inTitle = s.title.toLowerCase().includes(q)
            const inContent = s.content?.toLowerCase().includes(q)
            const inTags = (s.tags || []).some(t => t.toLowerCase().includes(q))
            if (!inTitle && !inContent && !inTags) return false
        }
        return true
    })

    function openCreate() {
        setEditingSOP(null)
        setForm(EMPTY_FORM)
        setLinkInput({ title: "", url: "" })
        setIsFormOpen(true)
    }

    const openEdit = useCallback((sop: SOP) => {
        setEditingSOP(sop)
        setForm({
            title: sop.title,
            content: sop.content || "",
            category: sop.category || "General",
            tags: (sop.tags || []).join(", "),
            links: (sop.links as SOPLink[] | null) || [],
        })
        setLinkInput({ title: "", url: "" })
        setIsFormOpen(true)
    }, [])

    function addLink() {
        if (!linkInput.url) return
        setForm(f => ({ ...f, links: [...f.links, { title: linkInput.title || linkInput.url, url: linkInput.url }] }))
        setLinkInput({ title: "", url: "" })
    }

    function removeLink(idx: number) {
        setForm(f => ({ ...f, links: f.links.filter((_, i) => i !== idx) }))
    }

    async function handleSave() {
        if (!form.title.trim()) { toast.error("Title is required"); return }
        setSaving(true)
        try {
            const payload = {
                title: form.title.trim(),
                content: form.content,
                category: form.category,
                tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
                links: form.links,
            }
            const url = editingSOP ? `/api/sops?id=${editingSOP.id}` : "/api/sops"
            const method = editingSOP ? "PATCH" : "POST"
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || "Failed to save")
            toast.success(editingSOP ? "SOP updated" : "SOP created")
            setIsFormOpen(false)
            fetchSOPs()
        } catch (error) {
            const e = error as Error;
            toast.error(e.message || "Failed to save SOP")
        } finally { setSaving(false) }
    }

    async function handleDelete(id: string) {
        try {
            const res = await fetch(`/api/sops?id=${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error((await res.json()).error)
            toast.success("SOP deleted")
            setDeletingId(null)
            if (selectedSOP?.id === id) setSelectedSOP(null)
            fetchSOPs()
        } catch (error) {
            const e = error as Error;
            toast.error(e.message || "Failed to delete")
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div className="flex items-start md:items-center flex-col md:flex-row md:justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Standard Operating Procedures</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {sops.length} procedure{sops.length !== 1 ? "s" : ""} · {allCategories.length} categor{allCategories.length !== 1 ? "ies" : "y"}
                    </p>
                </div>
                {canWrite && (
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" /> New SOP
                    </button>
                )}
            </div>

            {/* Search + Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by title, content, or tag…"
                        className="pl-10 h-9 rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {allCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        <button
                            onClick={() => setCategoryFilter(null)}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${!categoryFilter ? "bg-emerald-700 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-700"}`}
                        >
                            All
                        </button>
                        {allCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${categoryFilter === cat ? "bg-emerald-700 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-700"}`}
                            >
                                <FolderOpen className="w-3 h-3" /> {cat}
                            </button>
                        ))}
                    </div>
                )}

                {tagFilter && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Filtering by tag:</span>
                        <button
                            onClick={() => setTagFilter(null)}
                            className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md bg-emerald-700 text-white font-medium"
                        >
                            #{tagFilter} <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-56 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ))}
                </div>
            ) : filteredSops.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                        {search || categoryFilter || tagFilter ? "No matching SOPs" : "No SOPs yet"}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        {search || categoryFilter || tagFilter
                            ? "Try adjusting your filters."
                            : "Create the first standard operating procedure for your team."}
                    </p>
                    {canWrite && !search && !categoryFilter && !tagFilter && (
                        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors">
                            <Plus className="w-4 h-4" /> Create First SOP
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredSops.map(sop => (
                        <SOPCard
                            key={sop.id}
                            sop={sop}
                            canWrite={canWrite}
                            onView={() => setSelectedSOP(sop)}
                            onEdit={() => openEdit(sop)}
                            onDelete={() => setDeletingId(sop.id)}
                            activeTagFilter={tagFilter}
                            onTagClick={tag => setTagFilter(tagFilter === tag ? null : tag)}
                        />
                    ))}
                </div>
            )}

            {/* Create / Edit Modal */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">{editingSOP ? "Edit SOP" : "Create SOP"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Title *</label>
                            <Input
                                placeholder="e.g., Client Onboarding Process"
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                className="rounded-lg border-slate-200 dark:border-slate-800"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                            <select
                                value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5" /> Tags
                            </label>
                            <Input
                                placeholder="e.g., onboarding, sales, client (comma-separated)"
                                value={form.tags}
                                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                                className="rounded-lg border-slate-200 dark:border-slate-800"
                            />
                            {form.tags && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {form.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                                        <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Content <span className="text-slate-500 dark:text-slate-400 font-normal">(Markdown supported)</span></label>
                            <textarea
                                className="w-full min-h-[280px] p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none resize-y font-mono"
                                placeholder={"# Procedure Title\n\n## Overview\nBrief description here.\n\n## Steps\n1. First step...\n2. Second step...\n\n## Notes\nAny additional notes."}
                                value={form.content}
                                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                                onKeyDown={e => {
                                    if (e.key === "Tab") {
                                        e.preventDefault()
                                        const el = e.currentTarget
                                        const start = el.selectionStart
                                        const end = el.selectionEnd
                                        const newVal = el.value.substring(0, start) + "  " + el.value.substring(end)
                                        setForm(f => ({ ...f, content: newVal }))
                                        setTimeout(() => { el.selectionStart = el.selectionEnd = start + 2 }, 0)
                                    }
                                }}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400">Tip: Use # for headings, **bold**, *italic*, and - for bullet lists. Tab key inserts spaces.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <Link2 className="w-3.5 h-3.5" /> Useful Links
                            </label>
                            {form.links.map((link, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline flex-1 truncate">{link.title || link.url}</a>
                                    <button onClick={() => removeLink(idx)} className="text-slate-500 hover:text-rose-600 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Label (optional)"
                                    value={linkInput.title}
                                    onChange={e => setLinkInput(l => ({ ...l, title: e.target.value }))}
                                    className="rounded-lg border-slate-200 dark:border-slate-800 text-sm flex-1"
                                />
                                <Input
                                    placeholder="https://..."
                                    value={linkInput.url}
                                    onChange={e => setLinkInput(l => ({ ...l, url: e.target.value }))}
                                    className="rounded-lg border-slate-200 dark:border-slate-800 text-sm flex-1"
                                    onKeyDown={e => e.key === "Enter" && addLink()}
                                />
                                <button type="button" onClick={addLink} className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-700 transition-colors">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => setIsFormOpen(false)} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.title.trim()}
                                className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                                {saving ? "Saving…" : editingSOP ? "Save Changes" : "Create SOP"}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Modal */}
            <Dialog open={!!selectedSOP} onOpenChange={o => !o && setSelectedSOP(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md">
                                {selectedSOP?.category || "General"}
                            </span>
                            {selectedSOP?.content && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {readingTime(selectedSOP.content)}
                                </span>
                            )}
                            {selectedSOP && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                                    Updated {new Date(selectedSOP.updated_at || selectedSOP.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                                </span>
                            )}
                        </div>
                        <DialogTitle className="text-2xl font-bold leading-snug text-slate-900 dark:text-white">{selectedSOP?.title}</DialogTitle>

                        {selectedSOP?.tags && selectedSOP.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {selectedSOP.tags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => { setTagFilter(tag); setSelectedSOP(null) }}
                                        className="text-xs px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-colors font-medium"
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        )}
                    </DialogHeader>

                    <div className="py-4 max-w-none">
                        {selectedSOP?.content ? (
                            <div
                                className="text-slate-700 dark:text-slate-300 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedSOP.content) }}
                            />
                        ) : (
                            <p className="text-slate-500 dark:text-slate-400 italic">No content for this SOP.</p>
                        )}
                    </div>

                    {selectedSOP?.links && (selectedSOP.links as SOPLink[]).length > 0 && (
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 pb-2">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <Link2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> Useful Links
                            </h4>
                            <div className="space-y-2">
                                {(selectedSOP.links as SOPLink[]).map((link, i) => (
                                    <a
                                        key={i}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 transition-colors group/link"
                                    >
                                        <ExternalLink className="w-4 h-4 text-slate-500 group-hover/link:text-emerald-700 dark:group-hover/link:text-emerald-400 shrink-0" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover/link:text-emerald-700 dark:group-hover/link:text-emerald-400 truncate">{link.title || link.url}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate ml-auto hidden sm:block">{link.url}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {canWrite && selectedSOP && (
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex gap-3 justify-end">
                            <button
                                onClick={() => { setSelectedSOP(null); openEdit(selectedSOP) }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-700"
                            >
                                <Pencil className="w-4 h-4" /> Edit SOP
                            </button>
                            <button
                                onClick={() => { setSelectedSOP(null); setDeletingId(selectedSOP.id) }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-200 dark:border-rose-900/40 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={!!deletingId} onOpenChange={o => !o && setDeletingId(null)}>
                <DialogContent className="max-w-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">Delete SOP?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
                        This action cannot be undone. The SOP and all its content will be permanently removed.
                    </p>
                    <div className="flex gap-3 justify-end pt-2">
                        <button onClick={() => setDeletingId(null)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                        <button
                            onClick={() => deletingId && handleDelete(deletingId)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold"
                        >
                            <Trash2 className="w-4 h-4" /> Delete Permanently
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
