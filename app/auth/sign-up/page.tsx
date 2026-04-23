"use client"

import type React from "react"
import { APP_NAME } from "@/lib/config"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CheckCircle2, ChevronDown } from "lucide-react"

export default function SignUpPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState("developer")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      // Only allow safe, low-privilege roles at self-registration.
      // Elevated roles (virtual_assistant, book_keeper, etc.) must be assigned by an admin.
      const ALLOWED_SELF_SIGNUP_ROLES = ["developer", "graphic_designer", "social_media_manager"]
      const safeRole = ALLOWED_SELF_SIGNUP_ROLES.includes(role) ? role : "developer"

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
            role: safeRole,
            requested_role: role,
          },
        },
      })
      if (error) throw error
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    "w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-colors min-h-[48px]"

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* ═══ Left Brand Panel ═══ */}
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

        <div className="relative z-10 space-y-8 max-w-md">
          <div>
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight mb-4">
              Join the team.
            </h2>
            <p className="text-emerald-50/90 text-lg leading-relaxed">
              Get set up in under a minute. Track your tasks, log your hours, and stay in the loop — from anywhere.
            </p>
          </div>

          <ul className="space-y-3 text-emerald-50">
            {[
              "Live task assignments & reviews",
              "Built-in time tracking",
              "Team check-ins and status",
              "Secure role-based access",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-200" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-emerald-100/70">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </aside>

      {/* ═══ Right Form Panel ═══ */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xl">
              S
            </div>
            <span className="text-lg font-semibold text-slate-900">{APP_NAME}</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create your account</h1>
            <p className="text-slate-500 mt-2">Takes less than a minute to get started.</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1.5">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className={inputClass}
                placeholder="Jane Mwansa"
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1.5">
                Role
              </label>
              <div className="relative">
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={`${inputClass} appearance-none cursor-pointer pr-10`}
                >
                  <option value="developer">Developer</option>
                  <option value="graphic_designer">Graphic Designer</option>
                  <option value="social_media_manager">Social Media Manager</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Virtual Assistant, Bookkeeper, Sales &amp; Marketing roles are assigned by an admin after sign-up.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 active:bg-emerald-900 transition-colors min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>

            <p className="text-xs text-slate-500 text-center leading-relaxed">
              By signing up you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-600 text-sm">
              Already have an account?{" "}
              <a href="/auth/login" className="text-emerald-700 font-semibold hover:text-emerald-800">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
