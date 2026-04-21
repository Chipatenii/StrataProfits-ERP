"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Star, Plus, FileText, Eye
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PerformanceReview, UserProfile } from "@/lib/types"
import { toast } from "sonner"

interface ReviewsTabProps {
    isAdmin: boolean
    members: UserProfile[]
}

const RATING_LABELS = ["", "Needs Improvement", "Below Expectations", "Meets Expectations", "Exceeds Expectations", "Outstanding"]

export function ReviewsTab({ isAdmin, members }: ReviewsTabProps) {
    const [reviews, setReviews] = useState<PerformanceReview[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [viewingReview, setViewingReview] = useState<PerformanceReview | null>(null)
    const [form, setForm] = useState({
        user_id: "", review_period: "", overall_rating: 3,
        strengths: "", areas_for_improvement: "", goals: "", additional_notes: "", status: "draft"
    })

    const fetchReviews = useCallback(async () => {
        try {
            const res = await fetch("/api/hr/reviews")
            if (res.ok) setReviews(await res.json())
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchReviews() }, [fetchReviews])

    const handleSubmit = async () => {
        if (!form.user_id || !form.review_period) { toast.error("Select a team member and review period"); return }
        setSaving(true)
        try {
            const res = await fetch("/api/hr/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            toast.success("Review saved")
            setShowForm(false)
            setForm({ user_id: "", review_period: "", overall_rating: 3, strengths: "", areas_for_improvement: "", goals: "", additional_notes: "", status: "draft" })
            fetchReviews()
        } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
    }

    const handlePublish = async (id: string) => {
        try {
            const res = await fetch("/api/hr/reviews", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: "published" }),
            })
            if (!res.ok) throw new Error((await res.json()).error)
            toast.success("Review published — team member can now view it")
            fetchReviews()
        } catch (e: any) { toast.error(e.message) }
    }

    const renderStars = (rating: number | null) => {
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className={`w-4 h-4 ${i <= (rating || 0) ? "text-amber-500 fill-amber-500" : "text-slate-300 dark:text-slate-600"}`} />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Performance Reviews</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {isAdmin ? "Write and publish performance reviews for team members" : "View your performance feedback"}
                    </p>
                </div>
                {isAdmin && (
                    <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors">
                        <Plus className="w-4 h-4" /> New Review
                    </button>
                )}
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2].map(i => <div key={i} className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
                </div>
            ) : reviews.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No reviews yet</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {isAdmin ? "Create a performance review to get started." : "No reviews have been published for you yet."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {reviews.map(review => (
                        <div key={review.id} className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{review.user?.full_name || "Unknown"}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{review.review_period}</p>
                                </div>
                                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${review.status === "published" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"}`}>
                                    {review.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                {renderStars(review.overall_rating)}
                                {review.overall_rating && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{RATING_LABELS[review.overall_rating]}</span>
                                )}
                            </div>
                            {review.strengths && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{review.strengths}</p>
                            )}
                            <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <button onClick={() => setViewingReview(review)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-700">
                                    <Eye className="w-3 h-3" /> View
                                </button>
                                {isAdmin && review.status === "draft" && (
                                    <button onClick={() => handlePublish(review.id)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md transition-colors">
                                        Publish
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={!!viewingReview} onOpenChange={o => !o && setViewingReview(null)}>
                <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                            Review: {viewingReview?.user?.full_name} — {viewingReview?.review_period}
                        </DialogTitle>
                    </DialogHeader>
                    {viewingReview && (
                        <div className="space-y-5 py-2">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Rating:</span>
                                {renderStars(viewingReview.overall_rating)}
                                {viewingReview.overall_rating && <span className="text-sm text-slate-500 dark:text-slate-400">{RATING_LABELS[viewingReview.overall_rating]}</span>}
                            </div>
                            {viewingReview.strengths && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Strengths</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{viewingReview.strengths}</p>
                                </div>
                            )}
                            {viewingReview.areas_for_improvement && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Areas for Improvement</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{viewingReview.areas_for_improvement}</p>
                                </div>
                            )}
                            {viewingReview.goals && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Goals</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{viewingReview.goals}</p>
                                </div>
                            )}
                            {viewingReview.additional_notes && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Additional Notes</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{viewingReview.additional_notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">New Performance Review</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Team Member *</label>
                                <select
                                    value={form.user_id}
                                    onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                >
                                    <option value="">Select member…</option>
                                    {members.filter(m => m.role !== "admin" && m.role !== "client").map(m => (
                                        <option key={m.id} value={m.id}>{m.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Review Period *</label>
                                <Input placeholder="e.g. Q1 2026" value={form.review_period} onChange={e => setForm(f => ({ ...f, review_period: e.target.value }))} className="rounded-lg border-slate-200 dark:border-slate-800" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Overall Rating</label>
                            <div className="flex gap-1 items-center">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <button key={i} onClick={() => setForm(f => ({ ...f, overall_rating: i }))} className="p-1 hover:scale-110 transition-transform">
                                        <Star className={`w-6 h-6 ${i <= form.overall_rating ? "text-amber-500 fill-amber-500" : "text-slate-300 dark:text-slate-600"}`} />
                                    </button>
                                ))}
                                <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">{RATING_LABELS[form.overall_rating]}</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Strengths</label>
                            <textarea className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} placeholder="Key strengths and accomplishments..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Areas for Improvement</label>
                            <textarea className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" value={form.areas_for_improvement} onChange={e => setForm(f => ({ ...f, areas_for_improvement: e.target.value }))} placeholder="Areas that need development..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Goals for Next Period</label>
                            <textarea className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} placeholder="Objectives and key results for the next cycle..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Additional Notes</label>
                            <textarea className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none h-16 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" value={form.additional_notes} onChange={e => setForm(f => ({ ...f, additional_notes: e.target.value }))} placeholder="Any other comments..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Save As</label>
                            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm">
                                <option value="draft">Draft (visible only to admins)</option>
                                <option value="published">Published (visible to team member)</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                            <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                                {saving ? "Saving…" : "Save Review"}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
