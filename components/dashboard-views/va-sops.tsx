"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
    Book, Plus, Search, FileText, Pencil, Trash2, Tag, Link2,
    Clock, ChevronDown, X, MoreVertical, Check, ExternalLink,
    BookOpen, FolderOpen
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SOP } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = ["General", "HR", "Sales", "Tech", "Client Ops", "Finance", "Marketing", "Operations", "Other"] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip markdown for plain-text previews */
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

/** Rough reading time estimate */
function readingTime(content: string): string {
    const words = content.trim().split(/\s+/).length
    const mins = Math.max(1, Math.round(words / 200))
    return `${mins} min read`
}

/** Very lightweight markdown → HTML (no dependencies) */
function renderMarkdown(md: string): string {
    return md
        // Headings
        .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-5 mb-2 text-foreground">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-2 text-foreground">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-foreground">$1</h1>')
        // Bold / italic
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code class="bg-muted text-primary px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
        // Code blocks
        .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre class="bg-muted rounded-xl p-4 my-4 overflow-x-auto text-sm font-mono whitespace-pre">$1</pre>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline">$1</a>')
        // Horizontal rule
        .replace(/^---$/gm, '<hr class="border-border my-4" />')
        // Unordered lists (wrap lines starting with - or *)
        .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc list-outside">$1</li>')
        // Ordered lists
        .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal list-outside">$1</li>')
        // Paragraphs — wrap non-tag-starting lines
        .replace(/^(?!<)(.+)$/gm, '<p class="mb-3 leading-relaxed text-muted-foreground">$1</p>')
        // Cleanup empty paragraphs
        .replace(/<p class="[^"]+"><\/p>/g, '')
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Subcomponents ────────────────────────────────────────────────────────────

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
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col gap-3"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                        {sop.category || "General"}
                    </span>
                </div>
                {canWrite && (
                    <div ref={menuRef} className="relative" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setMenuOpen(v => !v)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                            aria-label="SOP actions"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 top-9 z-50 w-40 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/50 dark:border-slate-800 py-1 overflow-hidden">
                                <button
                                    onClick={() => { setMenuOpen(false); onEdit() }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Edit
                                </button>
                                <button
                                    onClick={() => { setMenuOpen(false); onDelete() }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Title & excerpt */}
            <div className="flex-1">
                <h3 className="font-bold text-lg mb-1.5 text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                    {sop.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{excerpt}</p>
            </div>

            {/* Tags */}
            {sop.tags && sop.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5" onClick={e => e.stopPropagation()}>
                    {sop.tags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => onTagClick(tag)}
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors ${activeTagFilter === tag
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-700"
                                }`}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-slate-100 dark:border-slate-800">
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function VASOPs() {
    const supabase = createClient()
    const [sops, setSops] = useState<SOP[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
    const [tagFilter, setTagFilter] = useState<string | null>(null)
    const [canWrite, setCanWrite] = useState(false)

    // Modals
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingSOP, setEditingSOP] = useState<SOP | null>(null)
    const [form, setForm] = useState<SOPFormData>(EMPTY_FORM)
    const [linkInput, setLinkInput] = useState({ title: "", url: "" })
    const [saving, setSaving] = useState(false)

    // View modal
    const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null)

    // Delete confirm
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // ── Auth check ──
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data }) => {
                setCanWrite(data?.role === "admin" || data?.role === "virtual_assistant")
            })
        })
    }, [supabase])

    // ── Fetch ──
    const fetchSOPs = useCallback(async () => {
        try {
            const res = await fetch("/api/sops")
            if (res.ok) setSops(await res.json())
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchSOPs() }, [fetchSOPs])

    // ── Derived ──
    const allCategories = Array.from(new Set(sops.map(s => s.category || "General"))).sort()
    const allTags = Array.from(new Set(sops.flatMap(s => s.tags || []))).sort()

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

    // ── Form helpers ──
    function openCreate() {
        setEditingSOP(null)
        setForm(EMPTY_FORM)
        setLinkInput({ title: "", url: "" })
        setIsFormOpen(true)
    }

    function openEdit(sop: SOP) {
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
    }

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
        } catch (e: any) {
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
        } catch (e: any) {
            toast.error(e.message || "Failed to delete")
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-8 animate-fade-in">

            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-10 text-white shadow-2xl shadow-indigo-500/30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Book className="w-5 h-5 text-indigo-200" />
                            <span className="text-sm font-medium text-indigo-100 uppercase tracking-wider">Knowledge Base</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">Standard Operating Procedures</h1>
                        <p className="text-indigo-100/80 text-lg">
                            {sops.length} procedure{sops.length !== 1 ? "s" : ""} · {allCategories.length} categor{allCategories.length !== 1 ? "ies" : "y"}
                        </p>
                    </div>
                    {canWrite && (
                        <Button
                            onClick={openCreate}
                            className="bg-white text-indigo-600 hover:bg-indigo-50 hover:shadow-lg transition-all duration-200 shadow-md font-bold text-base px-6 py-5 rounded-xl border-none shrink-0"
                        >
                            <Plus className="w-5 h-5 mr-2" /> New SOP
                        </Button>
                    )}
                </div>
            </div>

            {/* Search + Filters */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, content, or tag…"
                        className="pl-12 h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-base"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-4 top-3.5 text-muted-foreground hover:text-foreground transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Category pills */}
                {allCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setCategoryFilter(null)}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${!categoryFilter ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-white dark:bg-slate-900 text-muted-foreground border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:text-indigo-600"}`}
                        >
                            All
                        </button>
                        {allCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${categoryFilter === cat ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "bg-white dark:bg-slate-900 text-muted-foreground border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:text-indigo-600"}`}
                            >
                                <FolderOpen className="w-3.5 h-3.5" /> {cat}
                            </button>
                        ))}
                    </div>
                )}

                {/* Active tag filter badge */}
                {tagFilter && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Filtering by tag:</span>
                        <button
                            onClick={() => setTagFilter(null)}
                            className="flex items-center gap-1.5 text-sm px-3 py-1 rounded-full bg-indigo-600 text-white font-medium"
                        >
                            #{tagFilter} <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ))}
                </div>
            ) : filteredSops.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                        {search || categoryFilter || tagFilter ? "No matching SOPs" : "No SOPs yet"}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                        {search || categoryFilter || tagFilter
                            ? "Try adjusting your filters."
                            : "Create the first standard operating procedure for your team."}
                    </p>
                    {canWrite && !search && !categoryFilter && !tagFilter && (
                        <Button onClick={openCreate} className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl">
                            <Plus className="w-4 h-4 mr-2" /> Create First SOP
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

            {/* ── Create / Edit Modal ──────────────────────────────────────── */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-2xl bg-card rounded-2xl shadow-2xl border border-border/50 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">{editingSOP ? "Edit SOP" : "Create SOP"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-2">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">Title *</label>
                            <Input
                                placeholder="e.g., Client Onboarding Process"
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                className="rounded-xl border-slate-200 dark:border-slate-800"
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">Category</label>
                            <select
                                value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Tags */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5" /> Tags
                            </label>
                            <Input
                                placeholder="e.g., onboarding, sales, client (comma-separated)"
                                value={form.tags}
                                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                                className="rounded-xl border-slate-200 dark:border-slate-800"
                            />
                            {form.tags && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {form.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                                        <span key={tag} className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-medium">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">Content <span className="text-muted-foreground font-normal">(Markdown supported)</span></label>
                            <textarea
                                className="w-full min-h-[280px] p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-background text-foreground focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-y font-mono"
                                placeholder={"# Procedure Title\n\n## Overview\nBrief description here.\n\n## Steps\n1. First step...\n2. Second step...\n\n## Notes\nAny additional notes."}
                                value={form.content}
                                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                                onKeyDown={e => {
                                    // Support Tab key for indentation
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
                            <p className="text-xs text-muted-foreground">Tip: Use # for headings, **bold**, *italic*, and - for bullet lists. Tab key inserts spaces.</p>
                        </div>

                        {/* Useful Links */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                <Link2 className="w-3.5 h-3.5" /> Useful Links
                            </label>
                            {form.links.map((link, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/50">
                                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex-1 truncate">{link.title || link.url}</a>
                                    <button onClick={() => removeLink(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
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
                                <Button type="button" onClick={addLink} size="sm" variant="outline" className="rounded-lg shrink-0">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Footer buttons */}
                        <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={saving} className="rounded-xl">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving || !form.title.trim()}
                                className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl px-8"
                            >
                                {saving ? "Saving…" : editingSOP ? "Save Changes" : "Create SOP"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── View Modal ──────────────────────────────────────────────── */}
            <Dialog open={!!selectedSOP} onOpenChange={o => !o && setSelectedSOP(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-border/50">
                    <DialogHeader className="border-b border-border/50 pb-4">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full">
                                {selectedSOP?.category || "General"}
                            </span>
                            {selectedSOP?.content && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {readingTime(selectedSOP.content)}
                                </span>
                            )}
                            {selectedSOP && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                    Updated {new Date(selectedSOP.updated_at || selectedSOP.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                                </span>
                            )}
                        </div>
                        <DialogTitle className="text-2xl md:text-3xl font-bold leading-snug">{selectedSOP?.title}</DialogTitle>

                        {/* Tags in view modal */}
                        {selectedSOP?.tags && selectedSOP.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {selectedSOP.tags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => { setTagFilter(tag); setSelectedSOP(null) }}
                                        className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 hover:text-indigo-700 transition-colors font-medium"
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        )}
                    </DialogHeader>

                    {/* Rendered markdown content */}
                    <div className="py-6 prose prose-slate dark:prose-invert max-w-none">
                        {selectedSOP?.content ? (
                            <div
                                className="text-foreground leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedSOP.content) }}
                            />
                        ) : (
                            <p className="text-muted-foreground italic">No content for this SOP.</p>
                        )}
                    </div>

                    {/* Links section */}
                    {selectedSOP?.links && (selectedSOP.links as SOPLink[]).length > 0 && (
                        <div className="border-t border-border/50 pt-4 pb-2">
                            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                                <Link2 className="w-4 h-4 text-indigo-500" /> Useful Links
                            </h4>
                            <div className="space-y-2">
                                {(selectedSOP.links as SOPLink[]).map((link, i) => (
                                    <a
                                        key={i}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50 border border-border/50 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all group/link"
                                    >
                                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover/link:text-indigo-500 shrink-0" />
                                        <span className="text-sm font-medium text-foreground group-hover/link:text-indigo-600 truncate">{link.title || link.url}</span>
                                        <span className="text-xs text-muted-foreground truncate ml-auto hidden sm:block">{link.url}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Edit action for authorized users */}
                    {canWrite && selectedSOP && (
                        <div className="border-t border-border/50 pt-4 flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => { setSelectedSOP(null); openEdit(selectedSOP) }}
                                className="rounded-xl"
                            >
                                <Pencil className="w-4 h-4 mr-2" /> Edit SOP
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => { setSelectedSOP(null); setDeletingId(selectedSOP.id) }}
                                className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirm ──────────────────────────────────────────── */}
            <Dialog open={!!deletingId} onOpenChange={o => !o && setDeletingId(null)}>
                <DialogContent className="max-w-sm bg-card rounded-2xl border border-border/50">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Delete SOP?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground py-2">
                        This action cannot be undone. The SOP and all its content will be permanently removed.
                    </p>
                    <div className="flex gap-3 justify-end pt-2">
                        <Button variant="outline" onClick={() => setDeletingId(null)} className="rounded-xl">Cancel</Button>
                        <Button
                            onClick={() => deletingId && handleDelete(deletingId)}
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Permanently
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
