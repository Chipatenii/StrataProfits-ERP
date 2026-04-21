"use client"

import { useEffect, useState } from "react"
import { DailyCheckIn } from "@/lib/types"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"

export function DailyCheckInView({ userId }: { userId: string, userName: string }) {
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false)
  const [formData, setFormData] = useState({
    what_i_did: "",
    what_im_doing: "",
    blockers: ""
  })

  useEffect(() => {
    loadCheckIns()
  }, [])

  const loadCheckIns = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/checkins")
      if (response.ok) {
        const data = await response.json()
        setCheckIns(data)

        const today = new Date().toISOString().split("T")[0]
        const userCheckIn = data.find((c: DailyCheckIn) => c.user_id === userId && c.date === today)
        if (userCheckIn) {
          setHasCheckedInToday(true)
        }
      }
    } catch (error) {
      console.error("Failed to load check-ins:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.what_i_did.trim() || !formData.what_im_doing.trim()) {
      toast.error("Please fill in what you did and what you are doing")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success("Stand-up submitted successfully!")
        setHasCheckedInToday(true)
        setFormData({ what_i_did: "", what_im_doing: "", blockers: "" })
        loadCheckIns()
      } else {
        toast.error("Failed to submit stand-up")
      }
    } catch (error) {
      console.error("Error submitting check-in:", error)
      toast.error("Failed to submit stand-up")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading check-ins...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Daily stand-ups</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Async check-ins for the team. See what everyone is working on today.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Submission form */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 h-fit">
          <h3 className="font-semibold text-base text-slate-900 dark:text-white mb-4">Your check-in</h3>

          {hasCheckedInToday ? (
            <div className="flex flex-col items-center justify-center p-5 text-center bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-lg">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-2" />
              <h3 className="font-semibold text-sm text-emerald-800 dark:text-emerald-300">You&apos;re all set</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                Your stand-up for today has been recorded.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="did" className="text-xs font-medium text-slate-700 dark:text-slate-300">What did you do yesterday?</Label>
                <Textarea
                  id="did"
                  placeholder="e.g., Designed the new dashboard..."
                  className="resize-none h-20 text-sm"
                  value={formData.what_i_did}
                  onChange={(e) => setFormData({ ...formData, what_i_did: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doing" className="text-xs font-medium text-slate-700 dark:text-slate-300">What are you doing today?</Label>
                <Textarea
                  id="doing"
                  placeholder="e.g., Implementing the notification system..."
                  className="resize-none h-20 text-sm"
                  value={formData.what_im_doing}
                  onChange={(e) => setFormData({ ...formData, what_im_doing: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="blockers" className="text-xs font-medium text-slate-700 dark:text-slate-300">Any blockers? (optional)</Label>
                <Textarea
                  id="blockers"
                  placeholder="e.g., Waiting for API keys..."
                  className="resize-none h-16 text-sm"
                  value={formData.blockers}
                  onChange={(e) => setFormData({ ...formData, blockers: e.target.value })}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Post stand-up
              </button>
            </form>
          )}
        </div>

        {/* Team feed */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Today&apos;s updates</h3>

          {checkIns.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/30">
              <p className="text-sm text-slate-500 dark:text-slate-400">No one has checked in yet today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checkIns.map((checkin) => (
                <div key={checkin.id} className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-3">
                    {checkin.user?.avatar_url ? (
                      <img src={checkin.user.avatar_url} alt="" className="w-9 h-9 rounded-full bg-slate-100" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-semibold text-sm">
                        {checkin.user?.full_name?.charAt(0) || "U"}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">{checkin.user?.full_name || "Unknown user"}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{format(new Date(checkin.created_at), "h:mm a")}</div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Yesterday</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{checkin.what_i_did}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Today</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{checkin.what_im_doing}</p>
                    </div>
                  </div>

                  {checkin.blockers && (
                    <div className="mt-3 p-3 rounded-lg border border-rose-100 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/40 flex gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-rose-700 dark:text-rose-400">Blockers</div>
                        <p className="text-sm text-rose-800 dark:text-rose-300">{checkin.blockers}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
