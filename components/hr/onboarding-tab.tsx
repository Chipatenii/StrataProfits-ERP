"use client"

import { useState, useEffect, useCallback } from "react"
import {
    CheckCircle2, Circle, Plus, Trash2, ClipboardList, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { OnboardingTask, UserOnboardingProgress } from "@/lib/types"
import { toast } from "sonner"

const CATEGORIES = ["General", "IT Setup", "HR Paperwork", "Team Intro", "Training", "Tools & Access", "Other"] as const

const CATEGORY_COLORS: Record<string, string> = {
    "General": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    "IT Setup": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "HR Paperwork": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    "Team Intro": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "Training": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "Tools & Access": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    "Other": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
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

    // Group tasks by category
    const grouped = tasks.reduce<Record<string, OnboardingTask[]>>((acc, task) => {
        const cat = task.category || "General"
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(task)
        return acc
    }, {})

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Onboarding Checklist</h2>
                    <p className="text-sm text-muted-foreground">
                        {isAdmin ? "Manage the global onboarding checklist for new hires" : "Track your onboarding progress"}
                    </p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl">
                        <Plus className="w-4 h-4 mr-2" /> Add Task
                    </Button>
                )}
            </div>

            {/* Progress Bar */}
            {totalCount > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-foreground">Your Progress</span>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{completedCount}/{totalCount} ({progressPct}%)</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            ) : totalCount === 0 ? (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">No onboarding tasks</h3>
                    <p className="text-muted-foreground text-sm">
                        {isAdmin ? "Create the first onboarding checklist item." : "Your admin hasn't set up the onboarding checklist yet."}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([category, catTasks]) => (
                        <div key={category}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${CATEGORY_COLORS[category] || CATEGORY_COLORS["Other"]}`}>
                                    {category}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {catTasks.filter(t => progress.find(p => p.task_id === t.id)?.completed).length}/{catTasks.length}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {catTasks.map(task => {
                                    const taskProgress = progress.find(p => p.task_id === task.id)
                                    const isCompleted = taskProgress?.completed || false
                                    return (
                                        <div key={task.id} className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer group ${isCompleted
                                            ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30"
                                            : "bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                                            }`}
                                            onClick={() => handleToggle(task.id, isCompleted)}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                            ) : (
                                                <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-indigo-400" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                                    {task.title}
                                                </p>
                                                {task.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                                                )}
                                            </div>
                                            {isAdmin && (
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleDelete(task.id) }}
                                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1"
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

            {/* Add Task Modal */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-md bg-card rounded-2xl shadow-2xl border border-border/50">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Add Onboarding Task</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">Title *</label>
                            <Input placeholder="e.g. Set up company email" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">Description</label>
                            <textarea className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-background text-foreground resize-none h-20" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Instructions or details..." />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">Category</label>
                                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-foreground text-sm">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">Sort Order</label>
                                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className="rounded-xl" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancel</Button>
                            <Button onClick={handleCreate} disabled={saving} className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl px-6">
                                {saving ? "Creating…" : "Create Task"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
