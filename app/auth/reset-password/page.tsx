"use client"

import type React from "react"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { APP_NAME } from "@/lib/config"
import { CheckCircle2, KeyRound } from "lucide-react"

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordInner />
    </Suspense>
  )
}

function ResetPasswordFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent" />
    </div>
  )
}

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState<"checking" | "ready" | "missing">("checking")

  useEffect(() => {
    let active = true

    const init = async () => {
      // Supabase redirects with either ?code=... (PKCE) or a hash fragment that the SDK auto-consumes.
      const code = searchParams.get("code")
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!active) return
        if (error) {
          setSessionReady("missing")
          setError(
            error.message ||
              "This reset link is invalid or has expired. Request a new one from your admin or the forgot-password page."
          )
          return
        }
      }

      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSessionReady(data.session ? "ready" : "missing")
      if (!data.session) {
        setError(
          "No active session found. Open this page from the password reset email link."
        )
      }
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionReady("ready")
        setError(null)
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => router.push("/dashboard"), 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      <aside className="relative hidden lg:flex lg:w-[44%] xl:w-[40%] bg-emerald-700 text-white flex-col justify-between p-12 xl:p-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-400 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-80 h-80 bg-emerald-300 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white text-emerald-700 flex items-center justify-center font-bold text-xl">
            S
          </div>
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight mb-4">
            Choose a new password.
          </h2>
          <p className="text-emerald-50/90 text-lg leading-relaxed">
            Pick something strong — at least 8 characters. You&apos;ll be signed in
            automatically once it&apos;s saved.
          </p>
        </div>

        <p className="relative z-10 text-sm text-emerald-100/70">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xl">
              S
            </div>
            <span className="text-lg font-semibold text-slate-900">{APP_NAME}</span>
          </div>

          <div className="mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reset password</h1>
              <p className="text-slate-500 text-sm mt-0.5">Set a new password for your account.</p>
            </div>
          </div>

          {success ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Password updated</p>
                <p className="text-sm text-emerald-700 mt-0.5">
                  Redirecting you to your dashboard...
                </p>
              </div>
            </div>
          ) : sessionReady === "missing" ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                <p className="text-sm text-rose-700">{error || "Reset link is invalid or has expired."}</p>
              </div>
              <a
                href="/auth/forgot-password"
                className="block text-center w-full py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
              >
                Request a new link
              </a>
              <a href="/auth/login" className="block text-center text-sm text-emerald-700 font-medium hover:text-emerald-800">
                Back to sign in
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-colors min-h-[48px]"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  disabled={sessionReady === "checking"}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-colors min-h-[48px]"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  disabled={sessionReady === "checking"}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                  <p className="text-sm text-rose-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || sessionReady !== "ready"}
                className="w-full py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 active:bg-emerald-900 transition-colors min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Updating...
                  </>
                ) : sessionReady === "checking" ? (
                  "Verifying link..."
                ) : (
                  "Update password"
                )}
              </button>

              <div className="text-center">
                <a href="/auth/login" className="text-sm text-emerald-700 font-medium hover:text-emerald-800">
                  Back to sign in
                </a>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
