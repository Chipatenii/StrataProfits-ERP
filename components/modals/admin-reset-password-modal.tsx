"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Copy, Mail, KeyRound } from "lucide-react"

interface Props {
  open: boolean
  memberId: string
  memberName: string
  memberEmail: string | null
  onOpenChange: (open: boolean) => void
}

export function AdminResetPasswordModal({ open, memberId, memberName, memberEmail, onOpenChange }: Props) {
  const [mode, setMode] = useState<"set" | "link">("set")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [actionLink, setActionLink] = useState<string | null>(null)

  const reset = () => {
    setNewPassword("")
    setConfirmPassword("")
    setActionLink(null)
    setMode("set")
  }

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      let body: Record<string, unknown>
      if (mode === "set") {
        if (newPassword.length < 8) {
          toast.error("Password must be at least 8 characters.")
          setIsLoading(false)
          return
        }
        if (newPassword !== confirmPassword) {
          toast.error("Passwords do not match.")
          setIsLoading(false)
          return
        }
        body = { mode: "set", newPassword }
      } else {
        body = { mode: "link" }
      }

      const res = await fetch(`/api/admin/members/${memberId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to reset password")

      if (mode === "set") {
        toast.success(`Password updated for ${memberName}.`)
        handleClose(false)
      } else {
        toast.success(`Reset link generated. Supabase will email ${memberEmail}.`)
        if (data.action_link) setActionLink(data.action_link)
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-700" />
            Reset password
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Reset password for <strong className="text-slate-900 dark:text-white">{memberName}</strong>
            {memberEmail && <> · {memberEmail}</>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg p-1">
          <button
            type="button"
            onClick={() => { setMode("set"); setActionLink(null) }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "set"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <KeyRound size={14} /> Set new password
          </button>
          <button
            type="button"
            onClick={() => { setMode("link"); setActionLink(null) }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "link"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Mail size={14} /> Email reset link
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "set" ? (
            <>
              <div>
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  className="mt-1"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="mt-1"
                  autoComplete="new-password"
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The user can sign in with this new password immediately.
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Supabase will email <strong>{memberEmail}</strong> with a one-time link
                that opens the password reset page.
              </p>
              {actionLink && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-3">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Direct link (copy if email fails)
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={actionLink}
                      className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-700 dark:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(actionLink)
                        toast.success("Link copied")
                      }}
                      className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                      title="Copy link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => handleClose(false)}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (mode === "link" && !memberEmail)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
            >
              {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
              {isLoading
                ? (mode === "set" ? "Updating..." : "Generating...")
                : (mode === "set" ? "Set password" : "Send reset link")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
