"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { DailyCheckIn, UserProfile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"

export function DailyCheckInView({ userId, userName }: { userId: string, userName: string }) {
  const supabase = createClient()
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
        
        // Check if current user has checked in today
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
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Daily Stand-ups</h2>
        <p className="text-muted-foreground">
          Async check-ins for the team. See what everyone is working on today.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Submission Form */}
        <div className="lg:col-span-1 border rounded-xl bg-card p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2 font-semibold text-lg mb-6">
            <MessageSquare className="text-primary w-5 h-5" />
            Your Check-in
          </div>

          {hasCheckedInToday ? (
            <div className="flex flex-col items-center justify-center p-6 text-center bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-lg">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">You're all set!</h3>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                Your stand-up for today has been recorded.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="did">What did you do yesterday?</Label>
                <Textarea
                  id="did"
                  placeholder="e.g., Designed the new dashboard..."
                  className="resize-none h-20 bg-background"
                  value={formData.what_i_did}
                  onChange={(e) => setFormData({ ...formData, what_i_did: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doing">What are you doing today?</Label>
                <Textarea
                  id="doing"
                  placeholder="e.g., Implementing the notification system..."
                  className="resize-none h-20 bg-background"
                  value={formData.what_im_doing}
                  onChange={(e) => setFormData({ ...formData, what_im_doing: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blockers">Any blockers? (Optional)</Label>
                <Textarea
                  id="blockers"
                  placeholder="e.g., Waiting for API keys..."
                  className="resize-none h-16 bg-background"
                  value={formData.blockers}
                  onChange={(e) => setFormData({ ...formData, blockers: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Post Stand-up
              </Button>
            </form>
          )}
        </div>

        {/* Team Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-semibold mb-4">Today's Updates</h3>
          
          {checkIns.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-xl bg-muted/20 text-muted-foreground">
              No one has checked in yet today.
            </div>
          ) : (
            <div className="space-y-4">
              {checkIns.map((checkin) => (
                <div key={checkin.id} className="p-5 border rounded-xl bg-card shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    {checkin.user?.avatar_url ? (
                      <img src={checkin.user.avatar_url} alt="" className="w-10 h-10 rounded-full bg-muted" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {checkin.user?.full_name?.charAt(0) || "U"}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-foreground">{checkin.user?.full_name || "Unknown User"}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(checkin.created_at), "h:mm a")}</div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Yesterday</div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{checkin.what_i_did}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Today</div>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{checkin.what_im_doing}</p>
                    </div>
                  </div>

                  {checkin.blockers && (
                    <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 flex gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold uppercase text-red-600 dark:text-red-400">Blockers</div>
                        <p className="text-sm text-red-800 dark:text-red-300">{checkin.blockers}</p>
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
