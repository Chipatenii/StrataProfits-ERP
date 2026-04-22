"use client"

import { useState, useEffect, useCallback } from "react"
import {
    CheckCircle2, Circle, Plus, Trash2, ClipboardList
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { OnboardingTask, UserOnboardingProgress } from "@/lib/types"
import { toast } from "sonner"

const CATEGORIES = ["General", "IT Setup", "HR Paperwork", "Team Intro", "Training", "Tools & Access", "Other"] as const

const CATEGORY_COLORS: Record<string, string> = {
    "General": "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
    "IT Setup": "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    "HR Paperwork": "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    "Team Intro": "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    "Training": "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    "Tools & Access": "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
    "Other": "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
}

interface OnboardingTabProps {
    isAdmin: boolean
}

export function OnboardingTab({ isAdmin }: OnboardingTabProps) {
    const [tasks, setTasks] = useState<OnboardingTask[]>([])
    const [progress, setProgress] = useState<UserOnboardingProgress[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ title: "", description: "", category: "General", sort_order: 0 })

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/hr/onboarding")
            if (res.ok) {
                const data = await res.json()
                setTasks(data.tasks || [])
                setProgress(data.progress || [])
            }
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const handleToggle = async (taskId: string, currentCompleted: boolean) => {
        try {
            const res = await fetch("/api/hr/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "toggle_progress", task_id: taskId, completed: !currentCompleted }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            fetchData()
        } catch (e: any) { toast.error(e.message) }
    }

    const handleCreate = async () => {
        if (!form.title.trim()) { toast.error("Title is required"); return }
        setSaving(true)
        try {
            const res = await fetch("/api/hr/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            toast.success("Onboarding task created")
            setShowForm(false)
            setForm({ title: "", description: "", category: "General", sort_order: 0 })
            fetchData()
        } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/hr/onboarding?id=${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error((await res.json()).error)
            toast.success("Onboarding task removed")
            fetchData()
        } catch (e: any) { toast.error(e.message) }
    }

    const completedCount = tasks.filter(t => progress.find(p => p.task_id === t.id)?.completed).length
    const totalCount = tasks.length
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    const grouped = tasks.reduce<Record<string, OnboardingTask[]>>((acc, task) => {
        const cat = task.category || "General"
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(task)
        return acc
    }, {})

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Onboarding Checklist</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {isAdmin ? "Manage the global onboarding checklist for new hires" : "Track your onboarding progress"}
                    </p>
                </div>
                {isAdmin && (
                    <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors">
                        <Plus className="w-4 h-4" /> Add Task
                    </button>
                )}
            </div>

            {totalCount > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Your Progress</span>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{completedCount}/{totalCount} ({progressPct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-700 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
                </div>
            ) : totalCount === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <ClipboardList className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No onboarding tasks</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {isAdmin ? "Create the first onboarding checklist item." : "Your admin hasn&apos;t set up the onboarding checklist yet."}
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    {Object.entries(grouped).map(([category, catTasks]) => (
                        <div key={category}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${CATEGORY_COLORS[category] || CATEGORY_COLORS["Other"]}`}>
                                    {category}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {catTasks.filter(t => progress.find(p => p.task_id === t.id)?.completed).length}/{catTasks.length}
                                </span>
                            </div>
                            <div className="space-y-1.5">
                                {catTasks.map(task => {
                                    const taskProgress = progress.find(p => p.task_id === task.id)
                                    const isCompleted = taskProgress?.completed || false
                                    return (
                                        <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer group ${isCompleted
                                            ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40"
                                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700"
                                            }`}
                                            onClick={() => handleToggle(task.id, isCompleted)}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                                            ) : (
                                                <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-emerald-400" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium ${isCompleted ? "line-through text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
                                                    {task.title}
                                                </p>
                                                {task.description && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{task.description}</p>
                                                )}
                                            </div>
                                            {isAdmin && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleDelete(task.id) }}
                                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-all p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">Add Onboarding Task</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Title *</label>
                            <Input placeholder="e.g. Set up company email" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-lg border-slate-200 dark:border-slate-800" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                            <textarea className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Instructions or details..." />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Sort Order</label>
                                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="rounded-lg border-slate-200 dark:border-slate-800" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                            <button onClick={handleCreate} disabled={saving} className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                                {saving ? "Creating…" : "Create Task"}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
