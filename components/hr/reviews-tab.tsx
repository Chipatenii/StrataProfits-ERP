"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Star, Plus, User, FileText, ChevronDown, Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
                    <Star key={i} className={`w-4 h-4 ${i <= (rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600"}`} />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Performance Reviews</h2>
                    <p className="text-sm text-muted-foreground">
                        {isAdmin ? "Write and publish performance reviews for team members" : "View your performance feedback"}
                    </p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl">
                        <Plus className="w-4 h-4 mr-2" /> New Review
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2].map(i => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
                </div>
            ) : reviews.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">No reviews yet</h3>
                    <p className="text-muted-foreground text-sm">
                        {isAdmin ? "Create a performance review to get started." : "No reviews have been published for you yet."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {reviews.map(review => (
                        <div key={review.id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-lg shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 hover:shadow-xl transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-bold text-foreground">{review.user?.full_name || "Unknown"}</h3>
                                    <p className="text-sm text-muted-foreground">{review.review_period}</p>
                                </div>
                                <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${review.status === "published" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                                    {review.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                {renderStars(review.overall_rating)}
                                {review.overall_rating && (
                                    <span className="text-xs text-muted-foreground">{RATING_LABELS[review.overall_rating]}</span>
                                )}
                            </div>
                            {review.strengths && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{review.strengths}</p>
                            )}
                            <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                <Button size="sm" variant="outline" onClick={() => setViewingReview(review)} className="rounded-lg text-xs">
                                    <Eye className="w-3.5 h-3.5 mr-1" /> View
                                </Button>
                                {isAdmin && review.status === "draft" && (
                                    <Button size="sm" onClick={() => handlePublish(review.id)} className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs">
                                        Publish
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* View Review Modal */}
            <Dialog open={!!viewingReview} onOpenChange={o => !o && setViewingReview(null)}>
                <DialogContent className="max-w-2xl bg-card rounded-2xl shadow-2xl border border-border/50 max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            Review: {viewingReview?.user?.full_name} — {viewingReview?.review_period}
                        </DialogTitle>
                    </DialogHeader>
                    {viewingReview && (
                        <div className="space-y-5 py-2">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-foreground">Overall Rating:</span>
                                {renderStars(viewingReview.overall_rating)}
                                {viewingReview.overall_rating && <span className="text-sm text-muted-foreground">{RATING_LABELS[viewingReview.overall_rating]}</span>}
                            </div>
                            {viewingReview.strengths && (
                                <div>
                                    <h4 className="text-sm font-bold text-foreground mb-1">Strengths</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingReview.strengths}</p>
                                </div>
                            )}
                            {viewingReview.areas_for_improvement && (
                                <div>
                                    <h4 className="text-sm font-bold text-foreground mb-1">Areas for Improvement</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingReview.areas_for_improvement}</p>
                                </div>
                            )}
                            {viewingReview.goals && (
                                <div>
                                    <h4 className="text-sm font-bold text-foreground mb-1">Goals</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingReview.goals}</p>
                                </div>
                            )}
                            {viewingReview.additional_notes && (
                                <div>
                                    <h4 className="text-sm font-bold text-foreground mb-1">Additional Notes</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingReview.additional_notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Review Modal */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-2xl bg-card rounded-2xl shadow-2xl border border-border/50 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">New Performance Review</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">Team Member *</label>
                                <select
                                    value={form.user_id}
                                    onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-foreground text-sm"
                                >
                                    <option value="">Select member…</option>
                                    {members.filter(m => m.role !== "admin" && m.role !== "client").map(m => (
                                        <option key={m.id} value={m.id}>{m.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">Review Period *</label>
                                <Input placeholder="e.g. Q1 2026" value={form.review_period} onChange={e => setForm(f => ({ ...f, review_period: e.target.value }))} className="rounded-xl" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">Overall Rating</label>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <button key={i} onClick={() => setForm(f => ({ ...f, overall_rating: i }))} className="p-1 hover:scale-110 transition-transform">
                                        <Star className={`w-7 h-7 ${i <= form.overall_rating ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600"}`} />
                                    </button>
                                ))}
                                <span className="text-sm text-muted-foreground ml-2 self-center">{RATING_LABELS[form.overall_rating]}</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">Strengths</label>
                            <textarea className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-background text-foreground resize-none h-20" value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} placeholder="Key strengths and accomplishments..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">Areas for Improvement</label>
                            <textarea className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-background text-foreground resize-none h-20" value={form.areas_for_improvement} onChange={e => setForm(f => ({ ...f, areas_for_improvement: e.target.value }))} placeholder="Areas that need development..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">Goals for Next Period</label>
                            <textarea className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-background text-foreground resize-none h-20" value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} placeholder="Objectives and key results for the next cycle..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">Additional Notes</label>
                            <textarea className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-background text-foreground resize-none h-16" value={form.additional_notes} onChange={e => setForm(f => ({ ...f, additional_notes: e.target.value }))} placeholder="Any other comments..." />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-foreground">Save As</label>
                            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-foreground text-sm">
                                <option value="draft">Draft (visible only to admins)</option>
                                <option value="published">Published (visible to team member)</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancel</Button>
                            <Button onClick={handleSubmit} disabled={saving} className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl px-6">
                                {saving ? "Saving…" : "Save Review"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
